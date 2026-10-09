const fs = require('fs');

const content = `
export async function fetchSalesReturns(organizationId: string, locationId: string) {
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
}

export async function fetchSalesReturnDetails(returnId: string) {
  const returnResult = await db.select({
    id: salesReturns.id,
    returnNumber: salesReturns.returnNumber,
    returnDate: salesReturns.returnDate,
    status: salesReturns.status,
    totalAmount: salesReturns.totalAmount,
    reason: salesReturns.reason,
    invoiceNumber: salesInvoices.invoiceNumber,
    customerName: salesInvoices.customerName,
  }).from(salesReturns)
    .leftJoin(salesInvoices, eq(salesReturns.invoiceId, salesInvoices.id))
    .where(eq(salesReturns.id, returnId));

  if (returnResult.length === 0) return null;
  
  const linesResult = await db.select().from(salesReturnLines).where(eq(salesReturnLines.returnId, returnId));
  
  return {
    ...returnResult[0],
    items: linesResult
  };
}
`;

fs.appendFileSync('src/app/sales/actions.ts', content);
