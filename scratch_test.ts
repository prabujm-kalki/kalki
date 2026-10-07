import { db } from "./src/db";
import { sql } from "drizzle-orm";

async function run() {
  try {
    const res = await db.execute(sql`SELECT * FROM fixed_assets LIMIT 1`);
    console.log("SUCCESS", res.rows);
  } catch (e) {
    console.error("ERROR", e);
  } finally {
    process.exit(0);
  }
}

run();
