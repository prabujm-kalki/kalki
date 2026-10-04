import "dotenv/config";
import { db } from "../src/db/index.js";
import { sql } from "drizzle-orm";

async function alter() {
  try {
    await db.execute(sql`ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "po_number" text;`);
    await db.execute(sql`ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "short_code" text;`);
    console.log("Altered successfully!");
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

alter();
