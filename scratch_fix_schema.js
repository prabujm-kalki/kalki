const fs = require('fs');
let c = fs.readFileSync('src/db/schema.ts', 'utf8');

c = c.replace(
  /export const organizations = pgTable\(\s*\"organizations\",\s*\{([\s\S]*?)updatedAt: timestamp\(\"updated_at\", \{ withTimezone: true \}\)\s*\.notNull\(\)\s*\.defaultNow\(\),\s*\},\s*\(/g,
  `export const organizations = pgTable(
  "organizations",
  {$1updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    whatsappPoTemplate: text("whatsapp_po_template"),
  },
  (`
);

fs.writeFileSync('src/db/schema.ts', c);
console.log('done');
