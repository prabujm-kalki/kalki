const fs = require('fs');
let c = fs.readFileSync('src/db/schema.ts', 'utf8');
c = c.replace(/status: text\("status"\)\.notNull\(\)\.default\('draft'\),/g, 'status: text("status").notNull().default(\'draft\'),\n  paymentMethod: text("payment_method").notNull().default(\'credit\'),');
fs.writeFileSync('src/db/schema.ts', c);
