const fs = require('fs');

const func = `
export async function fetchInvoiceDetails(invoiceId: string) {
  const invoiceResult = await db.select().from(salesInvoices).where(eq(salesInvoices.id, invoiceId));
  if (invoiceResult.length === 0) return null;
  const invoice = invoiceResult[0];

  const lines = await db.select().from(salesInvoiceLines).where(eq(salesInvoiceLines.invoiceId, invoiceId));
  
  return {
    ...invoice,
    items: lines.map(line => ({
      description: line.itemDescription,
      qty: parseFloat(line.quantity as any),
      rate: parseFloat(line.unitRate as any),
      taxableAmount: parseFloat(line.taxableAmount as any),
      gstRate: parseFloat(line.gstRate as any),
      total: parseFloat(line.lineTotal as any)
    }))
  };
}
`;

fs.appendFileSync('src/app/sales/actions.ts', func);
console.log('Appended fetchInvoiceDetails');
