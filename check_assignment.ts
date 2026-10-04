import 'dotenv/config';
import { db } from './src/db';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    const tasks = await db.execute(sql`
      SELECT id, status, escalation_level, assigned_role_id, context_data->>'title' as title
      FROM task_instances
      ORDER BY created_at DESC
      LIMIT 5
    `);
    console.log("Recent Tasks:", JSON.stringify(tasks.rows, null, 2));
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
run();
