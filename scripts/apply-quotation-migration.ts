import { db } from "../src/db";
import { sql } from "drizzle-orm";
import fs from "fs";
import path from "path";

async function run() {
  console.log("Applying 0061_sales_quotations.sql migration...");
  const sqlContent = fs.readFileSync(path.join(process.cwd(), "drizzle", "0061_sales_quotations.sql"), "utf-8");
  await db.execute(sql.raw(sqlContent));
  console.log("Migration applied successfully!");
}

run().then(() => process.exit(0)).catch(err => {
  console.error("Migration error:", err);
  process.exit(1);
});
