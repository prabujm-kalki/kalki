const fs = require('fs');
let c = fs.readFileSync('src/db/schema.ts', 'utf8');

c = c.replace(
  '  index("purchase_orders_organization_location_idx").on(table.organizationId, table.locationId),\r\n]);',
  '  index("purchase_orders_organization_location_idx").on(table.organizationId, table.locationId),\r\n  index("purchase_orders_status_createdAt_idx").on(table.status, table.createdAt),\r\n  index("purchase_orders_createdAt_idx").on(table.createdAt),\r\n]);'
);

c = c.replace(
  '  index("inventory_ledger_item_idx").on(table.vendorItemId),\r\n]);',
  '  index("inventory_ledger_item_idx").on(table.vendorItemId),\r\n  index("inventory_ledger_item_recordedAt_idx").on(table.vendorItemId, table.recordedAt),\r\n]);'
);

// Fallback for LF
c = c.replace(
  '  index("purchase_orders_organization_location_idx").on(table.organizationId, table.locationId),\n]);',
  '  index("purchase_orders_organization_location_idx").on(table.organizationId, table.locationId),\n  index("purchase_orders_status_createdAt_idx").on(table.status, table.createdAt),\n  index("purchase_orders_createdAt_idx").on(table.createdAt),\n]);'
);

c = c.replace(
  '  index("inventory_ledger_item_idx").on(table.vendorItemId),\n]);',
  '  index("inventory_ledger_item_idx").on(table.vendorItemId),\n  index("inventory_ledger_item_recordedAt_idx").on(table.vendorItemId, table.recordedAt),\n]);'
);

fs.writeFileSync('src/db/schema.ts', c);
console.log('Patched schema.ts');
