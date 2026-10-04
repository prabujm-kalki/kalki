import { db } from '../src/db/index';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    await db.execute(sql`ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS process_owner_attachments JSONB;`);
    console.log('Done');
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}
main();
