const fs = require('fs');

// 1. Fix actions.ts to compute remaining quantity
let actionsContent = fs.readFileSync('src/app/sales/actions.ts', 'utf-8');
const fetchInvoiceDetailsReplacement = `
export async function fetchInvoiceDetails(invoiceId: string) {
  const invoiceResult = await db.select().from(salesInvoices).where(eq(salesInvoices.id, invoiceId));
  if (invoiceResult.length === 0) return null;
  const invoice = invoiceResult[0];

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
  pastReturns.forEach(pr => {
    returnedQtyMap[pr.itemId] = pr.returnedQty || 0;
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
  });

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
}
`;

const fetchInvoiceDetailsRegex = /export async function fetchInvoiceDetails\([\s\S]*?\}\s*\n/m;
actionsContent = actionsContent.replace(fetchInvoiceDetailsRegex, fetchInvoiceDetailsReplacement);

if (!actionsContent.includes('import { sql } from "drizzle-orm"')) {
  // It's probably already there since we added qty sum, but let's be safe.
}

fs.writeFileSync('src/app/sales/actions.ts', actionsContent);


// 2. Fix SalesReturns.tsx
let uiContent = fs.readFileSync('src/components/sales/SalesReturns.tsx', 'utf-8');

// A. Fix the Action button regex which failed last time.
// We'll replace the entire <td> for actions.
const actionTdRegex = /<td style=\{\{ padding: "1rem 0\.75rem", textAlign: "center" \}\}>\s*<button.*?>\s*<FileText size=\{18\} \/>\s*<\/button>\s*<\/td>/g;
const newActionTd = `<td style={{ padding: "1rem 0.75rem", textAlign: "center" }}>
                  <div style={{ position: "relative" }}>
                    <button onClick={() => setActionMenuOpen(actionMenuOpen === ret.id ? null : ret.id)} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer" }}>
                      <MoreVertical size={18} />
                    </button>
                    {actionMenuOpen === ret.id && (
                      <div style={{ position: "absolute", right: "0", top: "100%", backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "0.375rem", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", zIndex: 10, width: "120px", display: "flex", flexDirection: "column", padding: "0.5rem 0" }}>
                        <button onClick={() => { handleViewReturn(ret.id); setActionMenuOpen(null); }} style={{ padding: "0.5rem 1rem", textAlign: "left", background: "none", border: "none", cursor: "pointer", fontSize: "0.875rem", color: "#374151" }}>View Details</button>
                        {ret.status === 'DRAFT' && (
                           <button onClick={() => handleApproveDraft(ret.id)} style={{ padding: "0.5rem 1rem", textAlign: "left", background: "none", border: "none", cursor: "pointer", fontSize: "0.875rem", color: "#16a34a" }}>Approve</button>
                        )}
                        <button onClick={() => { alert("Printing..."); setActionMenuOpen(null); }} style={{ padding: "0.5rem 1rem", textAlign: "left", background: "none", border: "none", cursor: "pointer", fontSize: "0.875rem", color: "#374151" }}>Print</button>
                      </div>
                    )}
                  </div>
                </td>`;

uiContent = uiContent.replace(actionTdRegex, newActionTd);

// Also try the generic FileText if it didn't match
const altActionTdRegex = /<td style=\{\{ padding: "1rem 0\.75rem", textAlign: "center" \}\}>[\s\S]*?<FileText size=\{18\} \/>[\s\S]*?<\/td>/g;
uiContent = uiContent.replace(altActionTdRegex, newActionTd);

// B. Fix resetNewReturnModal to clear date
uiContent = uiContent.replace(
  `setReturnReason("Damaged Item");\n    setShowNewReturnModal(false);`,
  `setReturnReason("Damaged Item");\n    setReturnDate(new Date().toISOString().split('T')[0]);\n    setShowNewReturnModal(false);`
);

fs.writeFileSync('src/components/sales/SalesReturns.tsx', uiContent);
