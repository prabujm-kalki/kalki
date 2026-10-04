import 'dotenv/config';
import { db } from './src/db';
import { taskInstances } from './src/db/schema';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    const res = await db.execute(sql`SELECT id, status, created_at, context_data FROM task_instances WHERE status IN ('pending', 'in_progress', 'audit_pending')`);
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
run();
