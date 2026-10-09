const fs = require('fs');
let code = fs.readFileSync('src/db/schema.ts', 'utf8');

// Add jsonb import
if (!code.includes('jsonb,')) {
  code = code.replace(
    '} from "drizzle-orm/pg-core";',
    '  jsonb,\n} from "drizzle-orm/pg-core";'
  );
}

// Add tmbillRawData to salesInvoices
if (!code.includes('tmbillRawData')) {
  code = code.replace(
    'paymentMode: text("payment_mode").notNull(),',
    'paymentMode: text("payment_mode").notNull(),\n  tmbillRawData: jsonb("tmbill_raw_data"),'
  );
}

fs.writeFileSync('src/db/schema.ts', code);
console.log('Added jsonb import and tmbill_raw_data to salesInvoices');
