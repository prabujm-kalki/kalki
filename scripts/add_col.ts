import { db } from "../src/db";
import { sql } from "drizzle-orm";

async function main() {
  await db.execute(sql`ALTER TABLE organizations ADD COLUMN whatsapp_po_template TEXT DEFAULT 'Hello, please find Purchase Order #{poId} for {amount}.\n\n{items}\n\nView and download the PDF here: {link}';`);
  console.log("Column added");
}

main().catch(console.error);
