import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  const client = await pool.connect();
  try {
    console.log("Adding parent_group_id and system_category to account_groups...");
    await client.query(`
      ALTER TABLE "account_groups"
      ADD COLUMN IF NOT EXISTS "parent_group_id" uuid REFERENCES "account_groups"("id");
    `);
    
    await client.query(`
      ALTER TABLE "account_groups"
      ADD COLUMN IF NOT EXISTS "system_category" varchar(50);
    `);
    
    // Let's also add control_account_type to accounts to enforce AR/AP restrictions
    await client.query(`
      ALTER TABLE "accounts"
      ADD COLUMN IF NOT EXISTS "control_account_type" varchar(50);
    `);

    console.log("Database schema updated successfully for Phase 1.");
  } catch (error) {
    console.error("Error updating database schema:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
