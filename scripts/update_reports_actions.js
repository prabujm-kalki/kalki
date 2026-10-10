const fs = require('fs');
let code = fs.readFileSync('src/app/sales/reports/actions.ts', 'utf8');

if (!code.includes('import { salesChannels }')) {
  code = code.replace(
    'import { itemCategories, items, salesInvoiceLines } from "@/db/schema";',
    'import { itemCategories, items, salesInvoiceLines, salesChannels } from "@/db/schema";'
  );
}

code = code.replace(
  'orderCategory: salesInvoices.orderCategory,',
  'orderCategory: salesInvoices.orderCategory,\n      channelName: salesChannels.name,'
);

if (!code.includes('.leftJoin(salesChannels')) {
  code = code.replace(
    '.leftJoin(customers, eq(salesInvoices.customerId, customers.id))',
    '.leftJoin(customers, eq(salesInvoices.customerId, customers.id))\n    .leftJoin(salesChannels, eq(salesInvoices.channelId, salesChannels.id))'
  );
}

fs.writeFileSync('src/app/sales/reports/actions.ts', code);
console.log('done');
