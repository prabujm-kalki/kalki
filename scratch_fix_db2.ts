import { db } from "./src/db";
import { sql } from "drizzle-orm";

async function run() {
  try {
    console.log("Adding column...");
    await db.execute(sql`
      ALTER TABLE fixed_assets 
      ADD COLUMN IF NOT EXISTS depreciation_expense_account_id uuid;
    `);
    
    // We should not set NOT NULL if there are existing rows unless we give a default, but since it's probably empty or we can just ignore constraints for a bit if we need to. Let's just make it NOT NULL by finding a valid account ID if we need to, but for now we can just add the column.
    console.log("Success!");
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

run();
