const fs = require('fs');
let content = fs.readFileSync('src/app/sales/actions.ts', 'utf8');

content = content.replace(
  'id: salesInvoices.id,\n    invoiceNumber: salesInvoices.invoiceNumber,\n    customerName: salesInvoices.customerName,',
  'id: salesInvoices.id,\n    invoiceNumber: salesInvoices.invoiceNumber,\n    customerId: salesInvoices.customerId,\n    customerName: salesInvoices.customerName,'
);

fs.writeFileSync('src/app/sales/actions.ts', content);
console.log('Updated fetchPendingOrders');
