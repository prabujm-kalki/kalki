import { db } from "@/db";
import { sql } from "drizzle-orm";

async function main() {
  const res = await db.execute(sql`SELECT * FROM po_generation_schedules WHERE id = '66096d02-52e6-4d00-bef9-18624b988bf2'`);
  console.log("Schedule:", res.rows);
}
main().catch(console.error).then(() => process.exit(0));
