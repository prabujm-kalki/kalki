const fs = require('fs');
let content = fs.readFileSync('src/db/schema.ts', 'utf8');

const target = `  orderCategory: varchar("order_category", { length: 50 }),
  tmbillRawData: jsonb("tmbill_raw_data"),`;
const replacement = `  orderCategory: varchar("order_category", { length: 50 }),
  channelId: uuid("channel_id").references(() => salesChannels.id),
  tmbillRawData: jsonb("tmbill_raw_data"),`;

const newContent = content.replace(target, replacement);
fs.writeFileSync('src/db/schema.ts', newContent);
console.log('Done replacing channelId');
