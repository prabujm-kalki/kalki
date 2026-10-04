import 'dotenv/config';
import { db } from './src/db';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    console.log("Cleaning up hardcoded urgent escalation tasks...");
    await db.execute(sql`
      DELETE FROM task_instances 
      WHERE context_data::text LIKE '%URGENT ESCALATION%'
    `);
    console.log("Cleanup complete.");
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
run();
