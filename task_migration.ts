import { db } from "./src/db";
import { sql } from "drizzle-orm";

async function main() {
  try {
    console.log("Adding dynamic escalation columns...");
    await db.execute(sql`
      ALTER TABLE task_definitions 
      ADD COLUMN IF NOT EXISTS completion_time_mins INTEGER,
      ADD COLUMN IF NOT EXISTS escalation_delay_mins INTEGER,
      ADD COLUMN IF NOT EXISTS warning_threshold_mins INTEGER,
      ADD COLUMN IF NOT EXISTS allow_time_extension BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS max_extension_mins INTEGER;
    `);

    await db.execute(sql`
      ALTER TABLE task_instances
      ADD COLUMN IF NOT EXISTS extension_requested_mins INTEGER NOT NULL DEFAULT 0;
    `);
    
    console.log("Success!");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

main();
