import { db } from "../src/db";
import { sql } from "drizzle-orm";

async function main() {
  try {
    await db.execute(sql`ALTER TABLE employees ADD COLUMN uan_number TEXT;`);
    console.log("Added uan_number");
  } catch (e) { console.log("uan_number exists"); }
  try {
    await db.execute(sql`ALTER TABLE employees ADD COLUMN esi_number TEXT;`);
    console.log("Added esi_number");
  } catch (e) { console.log("esi_number exists"); }
  try {
    await db.execute(sql`ALTER TABLE employees ADD COLUMN pan_number TEXT;`);
    console.log("Added pan_number");
  } catch (e) { console.log("pan_number exists"); }
  console.log("Done");
  process.exit(0);
}

main();
