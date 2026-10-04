import { db } from "../src/db";
import { items, vendorItems } from "../src/db/schema";
import { inArray } from "drizzle-orm";

async function run() {
  const itemIds = ["1714482e-cc08-4eda-b2f6-b4511979f9ab", "3e3d5943-d249-42bc-8643-5a656624e1ae"];
  
  const foundItems = await db.select().from(items).where(inArray(items.id, itemIds));
  console.log(`Found ${foundItems.length} items`);
  
  const foundVendorItems = await db.select().from(vendorItems).where(inArray(vendorItems.itemId, itemIds));
  console.log(`Found ${foundVendorItems.length} vendor items`);
  
  process.exit(0);
}

run().catch(console.error);
