import "dotenv/config";
import { db } from "../src/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Adding missing ledger_account_mapping column to salary_components if not exists...");
  await db.execute(sql`
    ALTER TABLE salary_components 
    ADD COLUMN IF NOT EXISTS ledger_account_mapping varchar(255);
  `);
  console.log("salary_components.ledger_account_mapping column verified/added successfully.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

