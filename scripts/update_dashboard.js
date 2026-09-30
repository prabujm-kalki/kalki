const fs = require('fs');
let c = fs.readFileSync('src/domains/purchasing/dashboard.ts', 'utf8');

c = c.replace(/import \{ purchaseOrders, vendors, vendorItems \} from "@\/db\/schema";/, 'import { purchaseOrders, vendors, vendorItems, organizations } from "@/db/schema";');

c = c.replace(
  /poWhatsappPreference: vendors.poWhatsappPreference,/g,
  'poWhatsappPreference: vendors.poWhatsappPreference,\n      whatsappPoTemplate: organizations.whatsappPoTemplate,'
);

c = c.replace(
  /\.leftJoin\(vendors, eq\(purchaseOrders.vendorId, vendors.id\)\)/,
  '.leftJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))\n    .leftJoin(organizations, eq(purchaseOrders.organizationId, organizations.id))'
);

c = c.replace(
  /poWhatsappPreference: po.poWhatsappPreference,/g,
  'poWhatsappPreference: po.poWhatsappPreference,\n    whatsappPoTemplate: po.whatsappPoTemplate,'
);

fs.writeFileSync('src/domains/purchasing/dashboard.ts', c);
