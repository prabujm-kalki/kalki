import { db } from "../src/db";
import { purchaseOrders, purchaseOrderLines, items, vendors } from "../src/db/schema";
import { eq, ilike } from "drizzle-orm";

async function restore() {
  const poIdStr = "4e10b192";
  
  const allPOs = await db.select().from(purchaseOrders);
  const po = allPOs.find(p => p.id.startsWith(poIdStr));
  if (!po) {
    console.log("PO not found");
    return;
  }
  
  const allItems = await db.select().from(items);
  const onion = allItems.find(i => i.nameEn.includes("Onion"));
  const salt = allItems.find(i => i.nameEn.includes("Salt"));
  
  if (!onion || !salt) {
    console.log("Items not found");
    return;
  }
  
  await db.insert(purchaseOrderLines).values([
    {
      poId: po.id,
      itemId: onion.id,
      orderedQuantity: "10",
      unitRate: "0" // or appropriate rate
    },
    {
      poId: po.id,
      itemId: salt.id,
      orderedQuantity: "10",
      unitRate: "0"
    }
  ]);
  
  console.log("Restored PO lines for", po.id);
  process.exit(0);
}

restore();
