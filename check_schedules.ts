import 'dotenv/config';
import { db } from './src/db';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    const schedules = await db.execute(sql`
      SELECT id, vendor_id, reminder_time, frequency_rule, is_active
      FROM purchase_schedules
    `);
    console.log(JSON.stringify(schedules.rows, null, 2));
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
run();
