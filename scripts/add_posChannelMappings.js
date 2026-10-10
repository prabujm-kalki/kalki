const fs = require('fs');
let content = fs.readFileSync('src/db/schema.ts', 'utf8');

const mappingTable = `
export const posChannelMappings = pgTable('pos_channel_mappings', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').references(() => organizations.id).notNull(),
  locationId: uuid('location_id').references(() => locations.id),
  providerName: varchar('provider_name', { length: 50 }).notNull(), // e.g., 'TMBILL', 'SWIGGY'
  externalString: varchar('external_string', { length: 100 }).notNull(), // e.g., 'DineIn'
  internalChannelId: uuid('internal_channel_id').references(() => salesChannels.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
`;

fs.writeFileSync('src/db/schema.ts', content + '\n' + mappingTable);
console.log('Appended posChannelMappings');
