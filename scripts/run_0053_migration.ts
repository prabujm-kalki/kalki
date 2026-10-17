import { db } from "../src/db";
import { sql } from "drizzle-orm";
import fs from "fs";
import path from "path";

async function run() {
  const sqlFile = path.join(__dirname, "../drizzle/0053_automated_lifecycle_marketing.sql");
  const content = fs.readFileSync(sqlFile, "utf-8");
  const statements = content.split("--> statement-breakpoint").map(s => s.trim()).filter(Boolean);
  
  for (const statement of statements) {
    console.log("Executing statement...");
    await db.execute(sql.raw(statement));
  }
  console.log("Migration 0053 executed successfully!");
  process.exit(0);
}

run().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
