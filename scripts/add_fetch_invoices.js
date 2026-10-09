const fs = require('fs');

const func = `
export async function fetchInvoices(organizationId: string, locationId: string) {
  if (!organizationId || !locationId) return [];
  const list = await db.select()
    .from(salesInvoices)
    .where(and(eq(salesInvoices.organizationId, organizationId), eq(salesInvoices.locationId, locationId)))
    .orderBy(desc(salesInvoices.invoiceDate));
  
  return list.map(inv => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    customerName: inv.customerName,
    date: inv.invoiceDate ? inv.invoiceDate.toISOString().split('T')[0] : '',
    total: parseFloat(inv.grandTotal as any) || 0,
    status: inv.status,
    paymentStatus: inv.paymentStatus
  }));
}
`;

fs.appendFileSync('src/app/sales/actions.ts', func);
console.log('Appended fetchInvoices');
