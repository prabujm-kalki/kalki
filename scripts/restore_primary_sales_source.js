const fs = require('fs');

let code = fs.readFileSync('src/db/schema.ts', 'utf8');

// Add primarySalesSource back to organizations
if (!code.includes('primarySalesSource')) {
  code = code.replace(
    'whatsappPoTemplate: text("whatsapp_po_template"),',
    'whatsappPoTemplate: text("whatsapp_po_template"),\n    primarySalesSource: text("primary_sales_source").notNull().default("Hybrid"),'
  );
}

fs.writeFileSync('src/db/schema.ts', code);
console.log('Restored primarySalesSource to organizations in schema.ts');
