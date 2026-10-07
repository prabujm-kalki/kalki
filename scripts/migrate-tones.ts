import { db } from "../src/db";
import { sql } from "drizzle-orm";

async function main() {
  try {
    console.log("Adding custom_tones column...");
    await db.execute(sql`ALTER TABLE organizations ADD COLUMN IF NOT EXISTS custom_tones JSONB DEFAULT '{}';`);
    console.log("Success!");
  } catch (error) {
    console.error("Migration failed:", error);
  }
  process.exit(0);
}

main();
