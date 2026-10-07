import { db } from "../src/db";
import { sql } from "drizzle-orm";

async function main() {
  try {
    const res = await db.execute(sql`SELECT count(*) FROM "journal_entries" where ("journal_entries"."organization_id" = '00000000-0000-0000-0000-000000000000' and "journal_entries"."status" = 'PENDING_APPROVAL')`);
    console.log("Query success:", res);
  } catch (e: any) { 
    console.log("Query Error:", e.message); 
  }
  console.log("Done");
  process.exit(0);
}

main();
