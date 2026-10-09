const fs = require('fs');

// 1. Update schema.ts
let schemaContent = fs.readFileSync('src/db/schema.ts', 'utf-8');
if (!schemaContent.includes('returnPolicies: jsonb("return_policies")')) {
  schemaContent = schemaContent.replace(
    'customTones: jsonb("custom_tones").default({}),',
    `customTones: jsonb("custom_tones").default({}),\n    returnPolicies: jsonb("return_policies").default({\n      maxReturnDays: 30,\n      allowMultipleReturns: true,\n      requireApproval: true,\n      applyRestockingFee: "None"\n    }),`
  );
  fs.writeFileSync('src/db/schema.ts', schemaContent);
}

// 2. Update actions.ts to enforce policies
let actionsContent = fs.readFileSync('src/app/sales/actions.ts', 'utf-8');

// Check if returnPolicies is already handled in fetchInvoiceDetails
if (!actionsContent.includes('const org = orgResult[0];')) {
  const fetchInvoiceReplacement = `export async function fetchInvoiceDetails(invoiceId: string) {
  const invoiceResult = await db.select().from(salesInvoices).where(eq(salesInvoices.id, invoiceId));
  if (invoiceResult.length === 0) return null;
  const invoice = invoiceResult[0];

  // Fetch Organization Policies
  const orgResult = await db.select({ returnPolicies: organizations.returnPolicies }).from(organizations).where(eq(organizations.id, invoice.organizationId));
  const returnPolicies = orgResult.length > 0 && orgResult[0].returnPolicies ? (orgResult[0].returnPolicies as any) : {
    maxReturnDays: 30,
    allowMultipleReturns: true
  };

  // Enforce Max Return Days Policy
  if (returnPolicies.maxReturnDays && returnPolicies.maxReturnDays !== "No Limit") {
    const invoiceDate = new Date(invoice.invoiceDate);
    const currentDate = new Date();
    const diffTime = Math.abs(currentDate.getTime() - invoiceDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > returnPolicies.maxReturnDays) {
      throw new Error(\`Return window of \${returnPolicies.maxReturnDays} days has expired for this invoice.\`);
    }
  }

  const lines = await db.select().from(salesInvoiceLines).where(eq(salesInvoiceLines.invoiceId, invoiceId));
  
  // Calculate previously returned quantities
  const pastReturns = await db.select({
    itemId: salesReturnLines.itemId,
    returnedQty: sql<number>\`SUM(\${salesReturnLines.returnQty})\`.mapWith(Number)
  }).from(salesReturns)
    .innerJoin(salesReturnLines, eq(salesReturns.id, salesReturnLines.returnId))
    .where(and(eq(salesReturns.invoiceId, invoiceId), eq(salesReturns.status, 'APPROVED')))
    .groupBy(salesReturnLines.itemId);

  const returnedQtyMap: Record<string, number> = {};
  let totalReturnedItems = 0;
  pastReturns.forEach(pr => {
    returnedQtyMap[pr.itemId] = pr.returnedQty || 0;
    if (pr.returnedQty > 0) totalReturnedItems++;
  });

  const draftedReturns = await db.select({
    itemId: salesReturnLines.itemId,
    returnedQty: sql<number>\`SUM(\${salesReturnLines.returnQty})\`.mapWith(Number)
  }).from(salesReturns)
    .innerJoin(salesReturnLines, eq(salesReturns.id, salesReturnLines.returnId))
    .where(and(eq(salesReturns.invoiceId, invoiceId), eq(salesReturns.status, 'DRAFT')))
    .groupBy(salesReturnLines.itemId);
    
  draftedReturns.forEach(pr => {
    returnedQtyMap[pr.itemId] = (returnedQtyMap[pr.itemId] || 0) + (pr.returnedQty || 0);
    if (pr.returnedQty > 0) totalReturnedItems++;
  });

  // Enforce Multiple Returns Policy
  if (returnPolicies.allowMultipleReturns === false && totalReturnedItems > 0) {
     throw new Error("This organization's policy strictly prohibits multiple return instances per invoice. A return has already been processed for this bill.");
  }

  return {
    ...invoice,
    items: lines.map(line => {
      const originalQty = parseFloat(line.quantity as any);
      const returnedQty = returnedQtyMap[line.itemId] || 0;
      const remainingQty = Math.max(0, originalQty - returnedQty);
      return {
        itemId: line.itemId,
        description: line.itemDescription,
        qty: remainingQty,
        originalQty: originalQty,
        rate: parseFloat(line.unitRate as any),
        taxableAmount: parseFloat(line.taxableAmount as any),
        gstRate: parseFloat(line.gstRate as any),
        total: parseFloat(line.lineTotal as any)
      };
    }).filter(item => item.qty > 0)
  };
}`;
  const oldFetchRegex = /export async function fetchInvoiceDetails\([\s\S]*?\}\s*\n/m;
  actionsContent = actionsContent.replace(oldFetchRegex, fetchInvoiceReplacement);

  if (!actionsContent.includes('organizations')) {
    actionsContent = actionsContent.replace('salesReturnLines', 'salesReturnLines, organizations');
  }

  fs.writeFileSync('src/app/sales/actions.ts', actionsContent);
}

// 3. We also need a way for the UI to show these errors instead of crashing!
let uiContent = fs.readFileSync('src/components/sales/SalesReturns.tsx', 'utf-8');
const handleFetchInvoiceDetailsRegex = /fetchInvoiceDetails\(selectedInvoiceId\)\.then\(data => \{[\s\S]*?\}\);/m;

uiContent = uiContent.replace(handleFetchInvoiceDetailsRegex, `fetchInvoiceDetails(selectedInvoiceId).then(data => {
      setInvoiceDetails(data);
      if (data && data.items) {
        setReturnItems(data.items.map((item: any) => ({
          ...item,
          returnQty: 0,
          addToInventory: true
        })));
      }
      setLoadingDetails(false);
    }).catch(err => {
      alert(err.message || "Failed to load invoice details");
      setLoadingDetails(false);
      setSelectedInvoiceId("");
    });`);

fs.writeFileSync('src/components/sales/SalesReturns.tsx', uiContent);
