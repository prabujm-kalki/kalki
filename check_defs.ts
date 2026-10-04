import 'dotenv/config';
import { db } from './src/db';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    const res = await db.execute(sql`SELECT id, title, completion_time_mins FROM task_definitions`);
    console.log("ALL TASK DEFINITIONS:");
    console.dir(res.rows, { depth: null });
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
run();
