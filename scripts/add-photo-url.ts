import { db } from "../src/db";
import { sql } from "drizzle-orm";

async function main() {
  try {
    await db.execute(sql`ALTER TABLE people ADD COLUMN IF NOT EXISTS photo_url text;`);
    console.log("Successfully added photo_url to people table");
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
main();
