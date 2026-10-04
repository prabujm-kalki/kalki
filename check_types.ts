import 'dotenv/config';
import { db } from './src/db';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    const res = await db.execute(sql`
      SELECT id, title, module, action_type, trigger_type, context_template
      FROM task_definitions
      WHERE is_active = true
    `);
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
run();
