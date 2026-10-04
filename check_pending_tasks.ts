import 'dotenv/config';
import { db } from './src/db';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    console.log("\n=== TODAY'S PENDING TASKS ===");
    const tasks = await db.execute(sql`
      SELECT id, status, created_at, context_data
      FROM task_instances
      WHERE status = 'pending'
      ORDER BY created_at DESC
      LIMIT 10
    `);
    console.log(JSON.stringify(tasks.rows, null, 2));
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
run();
