import { Client } from "pg";
import "dotenv/config";

async function main() {
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
