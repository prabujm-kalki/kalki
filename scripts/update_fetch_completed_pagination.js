const fs = require('fs');

let content = fs.readFileSync('src/app/sales/actions.ts', 'utf8');

const fetchCompletedOrdersOld = `export async function fetchCompletedOrders(organizationId: string, locationId: string, searchQuery?: string) {
  if (!organizationId || !locationId) return [];
  
  return await db.select({
    id: salesInvoices.id,
    invoiceNumber: salesInvoices.invoiceNumber,
    customerName: salesInvoices.customerName,
    invoiceDate: salesInvoices.invoiceDate,
    dueDate: salesInvoices.dueDate,
    paymentStatus: salesInvoices.paymentStatus,
    paymentMode: salesInvoices.paymentMode,
    grandTotal: salesInvoices.grandTotal,
  }).from(salesInvoices)
    .where(
      and(
        eq(salesInvoices.organizationId, organizationId),
        eq(salesInvoices.locationId, locationId),
        eq(salesInvoices.paymentStatus, 'PAID'),
        ...(searchQuery
          ? [
              or(
                ilike(salesInvoices.invoiceNumber, \`%\${searchQuery}%\`),
                ilike(salesInvoices.customerName, \`%\${searchQuery}%\`)
              ),
            ]
          : [])
      )
    )
    .orderBy(desc(salesInvoices.invoiceDate));
}`;

const fetchCompletedOrdersNew = `export async function fetchCompletedOrders(organizationId: string, locationId: string, searchQuery?: string, page: number = 1, limit: number = 10) {
  if (!organizationId || !locationId) return { data: [], total: 0 };
  
  const offset = (page - 1) * limit;

  const whereClause = and(
    eq(salesInvoices.organizationId, organizationId),
    eq(salesInvoices.locationId, locationId),
    eq(salesInvoices.paymentStatus, 'PAID'),
    ...(searchQuery
      ? [
          or(
            ilike(salesInvoices.invoiceNumber, \`%\${searchQuery}%\`),
            ilike(salesInvoices.customerName, \`%\${searchQuery}%\`)
          ),
        ]
      : [])
  );

  const data = await db.select({
    id: salesInvoices.id,
    invoiceNumber: salesInvoices.invoiceNumber,
    customerName: salesInvoices.customerName,
    invoiceDate: salesInvoices.invoiceDate,
    dueDate: salesInvoices.dueDate,
    paymentStatus: salesInvoices.paymentStatus,
    paymentMode: salesInvoices.paymentMode,
    grandTotal: salesInvoices.grandTotal,
  })
    .from(salesInvoices)
    .where(whereClause)
    .orderBy(desc(salesInvoices.invoiceDate))
    .limit(limit)
    .offset(offset);

  const totalResult = await db.select({ count: sql<number>\`count(*)\` }).from(salesInvoices).where(whereClause);
  const total = Number(totalResult[0]?.count || 0);

  return { data, total };
}`;

content = content.replace(fetchCompletedOrdersOld, fetchCompletedOrdersNew);
fs.writeFileSync('src/app/sales/actions.ts', content);
console.log("actions.ts updated successfully.");
