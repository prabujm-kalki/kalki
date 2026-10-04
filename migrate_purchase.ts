import 'dotenv/config';
import { db } from './src/db';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    await db.execute(sql`ALTER TABLE purchase_schedules ADD COLUMN task_definition_id uuid REFERENCES task_definitions(id)`);
    console.log("Migration successful.");
  } catch (err) {
    console.error("Migration failed:", err);
  }
  process.exit(0);
}

run();
