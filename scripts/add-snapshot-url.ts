import { db } from "../src/db";
import { sql } from "drizzle-orm";

async function main() {
  try {
    await db.execute(sql`ALTER TABLE raw_biometric_punches ADD COLUMN IF NOT EXISTS snapshot_url text;`);
    console.log("Successfully added snapshot_url to raw_biometric_punches table");
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
main();
