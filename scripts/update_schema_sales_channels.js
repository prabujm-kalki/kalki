const fs = require('fs');
let content = fs.readFileSync('src/db/schema.ts', 'utf8');

// Add salesChannels table
const salesChannelsDef = `
export const salesChannels = pgTable('sales_channels', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').references(() => organizations.id).notNull(),
  locationId: uuid('location_id').references(() => locations.id),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
`;

// Add channelId to salesInvoices
const invoiceRepl = "orderCategory: varchar('order_category', { length: 50 }),\n  channelId: uuid('channel_id').references(() => salesChannels.id),";

content = content + '\n' + salesChannelsDef;
content = content.replace("orderCategory: varchar('order_category', { length: 50 }),", invoiceRepl);

fs.writeFileSync('src/db/schema.ts', content);
