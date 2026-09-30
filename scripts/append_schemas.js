const fs = require('fs');
let c = fs.readFileSync('src/db/schema.ts', 'utf8');
c = c.replace(/logoUrl: text\("logo_url"\),/, 'logoUrl: text("logo_url"),\n  whatsappPoTemplate: text("whatsapp_po_template").default(\'Hello, please find Purchase Order #{poId} for {amount}.\\n\\n{items}\\n\\nView and download the PDF here: {link}\'),');
fs.writeFileSync('src/db/schema.ts', c);
