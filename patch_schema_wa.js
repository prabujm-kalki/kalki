const fs = require('fs');

let schema = fs.readFileSync('src/db/schema.ts', 'utf8');

schema = schema.replace(
  `  isActive: boolean("is_active").notNull().default(true),\n  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),`,
  `  isActive: boolean("is_active").notNull().default(true),\n  poDeliveryMethod: text("po_delivery_method").notNull().default('WHATSAPP'),\n  poWhatsappPreference: text("po_whatsapp_preference").notNull().default('TEXT_AND_PDF_LINK'),\n  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),`
);

schema = schema.replace(
  `  totalAmount: numeric("total_amount").notNull(),\n  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),`,
  `  totalAmount: numeric("total_amount").notNull(),\n  publicToken: text("public_token"),\n  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),`
);

fs.writeFileSync('src/db/schema.ts', schema, 'utf8');
console.log("Schema patched");
