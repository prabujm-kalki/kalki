const fs = require('fs');
let actionsStr = fs.readFileSync('src/app/sales/actions.ts', 'utf-8');

if (!actionsStr.includes('approveSalesReturn')) {
  const appendStr = `
export async function approveSalesReturn(returnId: string) {
  await db.update(salesReturns).set({ status: 'APPROVED' }).where(eq(salesReturns.id, returnId));
  return { success: true };
}
`;
  actionsStr += appendStr;
}

if (!actionsStr.includes('invoiceId: salesReturns.invoiceId')) {
  actionsStr = actionsStr.replace(
    'invoiceNumber: salesInvoices.invoiceNumber,',
    'invoiceNumber: salesInvoices.invoiceNumber,\n    invoiceId: salesReturns.invoiceId,'
  );
}

fs.writeFileSync('src/app/sales/actions.ts', actionsStr);
