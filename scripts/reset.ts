import { Client } from "pg";
import "dotenv/config";

async function main() {
  if (!process.argv.includes("--confirm-wipe-all-data")) {
    console.error("ERROR: This script will permanently delete all data in the database.");
    console.error("To proceed, you must run this script with the --confirm-wipe-all-data flag.");
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();
  
  console.log("Dropping public and drizzle schemas...");
  await client.query("DROP SCHEMA public CASCADE;");
  await client.query("DROP SCHEMA IF EXISTS drizzle CASCADE;");
  
  console.log("Recreating public schema...");
  await client.query("CREATE SCHEMA public;");
  
  await client.end();
  console.log("Database reset complete.");
}

main().catch(console.error);
