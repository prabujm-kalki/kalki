import { db } from '../src/db';
import { sql } from 'drizzle-orm';
async function run() {
  await db.execute(sql.raw('ALTER TABLE shift_definitions ADD COLUMN IF NOT EXISTS grace_period_minutes integer DEFAULT 15 NOT NULL;'));
  console.log('Done');
  process.exit(0);
}
run();
