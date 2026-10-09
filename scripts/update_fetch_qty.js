const fs = require('fs');
let content = fs.readFileSync('src/app/sales/actions.ts', 'utf-8');

const targetStr = `export async function fetchSalesReturns(organizationId: string, locationId: string) {
  if (!organizationId || !locationId) return [];
  
  const returns = await db.select({
    id: salesReturns.id,
    returnNumber: salesReturns.returnNumber,
    returnDate: salesReturns.returnDate,
    status: salesReturns.status,
    totalAmount: salesReturns.totalAmount,
    invoiceNumber: salesInvoices.invoiceNumber,
    customerName: salesInvoices.customerName,
  }).from(salesReturns)
    .leftJoin(salesInvoices, eq(salesReturns.invoiceId, salesInvoices.id))
    .where(and(eq(salesReturns.organizationId, organizationId), eq(salesReturns.locationId, locationId)))
    .orderBy(desc(salesReturns.createdAt));

  return returns.map(ret => ({
    id: ret.id,
    returnId: ret.returnNumber,
    date: ret.returnDate ? ret.returnDate.toISOString().split('T')[0] : '',
    invoice: ret.invoiceNumber || 'Unknown',
    customer: ret.customerName || 'Unknown',
    qty: '-', // Could compute sum of line qtys, but leaving as dash for list view
    amount: "₹ " + parseFloat(ret.totalAmount as any).toFixed(2),
    status: ret.status
  }));
}`;

const replaceStr = `export async function fetchSalesReturns(organizationId: string, locationId: string) {
  if (!organizationId || !locationId) return [];
  
  const returns = await db.select({
    id: salesReturns.id,
    returnNumber: salesReturns.returnNumber,
    returnDate: salesReturns.returnDate,
    status: salesReturns.status,
    totalAmount: salesReturns.totalAmount,
    invoiceNumber: salesInvoices.invoiceNumber,
    customerName: salesInvoices.customerName,
    qty: sql<number>\`COALESCE(SUM(\${salesReturnLines.returnQty}), 0)\`.mapWith(Number)
  }).from(salesReturns)
    .leftJoin(salesInvoices, eq(salesReturns.invoiceId, salesInvoices.id))
    .leftJoin(salesReturnLines, eq(salesReturns.id, salesReturnLines.returnId))
    .where(and(eq(salesReturns.organizationId, organizationId), eq(salesReturns.locationId, locationId)))
    .groupBy(
      salesReturns.id,
      salesReturns.returnNumber,
      salesReturns.returnDate,
      salesReturns.status,
      salesReturns.totalAmount,
      salesInvoices.invoiceNumber,
      salesInvoices.customerName,
      salesReturns.createdAt
    )
    .orderBy(desc(salesReturns.createdAt));

  return returns.map(ret => ({
    id: ret.id,
    returnId: ret.returnNumber,
    date: ret.returnDate ? ret.returnDate.toISOString().split('T')[0] : '',
    invoice: ret.invoiceNumber || 'Unknown',
    customer: ret.customerName || 'Unknown',
    qty: ret.qty,
    amount: "₹ " + parseFloat(ret.totalAmount as any).toFixed(2),
    status: ret.status
  }));
}`;

content = content.replace(targetStr, replaceStr);
fs.writeFileSync('src/app/sales/actions.ts', content);
