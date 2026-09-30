const fs = require('fs');
let content = fs.readFileSync('src/db/schema.ts', 'utf8');
content = content.replace('totalAmount: numeric("total_amount").notNull(),\n  createdAt', 'totalAmount: numeric("total_amount").notNull(),\n  paymentMethod: text("payment_method").notNull().default("credit"),\n  createdAt');
fs.writeFileSync('src/db/schema.ts', content);
