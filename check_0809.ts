import 'dotenv/config';
import { db } from './src/db';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    const schedules = await db.execute(sql`
      SELECT id, vendor_id, reminder_time, frequency_rule, is_active
      FROM purchase_schedules
      WHERE reminder_time = '08:09'
    `);
    console.log("Schedules:", JSON.stringify(schedules.rows, null, 2));
    
    const tasks = await db.execute(sql`
      SELECT id, status, escalation_level, assigned_role_id, context_data->>'title' as title
      FROM task_instances
      ORDER BY created_at DESC
      LIMIT 10
    `);
    console.log("Tasks:", JSON.stringify(tasks.rows, null, 2));
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
run();
