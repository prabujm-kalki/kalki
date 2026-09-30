const fs = require('fs');
let data = fs.readFileSync('src/db/schema.ts', 'utf8');
data = data.replace(
  'totalNetAmount: numeric("total_net_amount").notNull().default(\'0\'),',
  'totalNetAmount: numeric("total_net_amount").notNull().default(\'0\'),\n  paymentMode: varchar("payment_mode", { length: 50 }),\n  paymentReference: text("payment_reference"),\n  paymentAttachments: jsonb("payment_attachments").default(\'[]\'),'
);
fs.writeFileSync('src/db/schema.ts', data);
