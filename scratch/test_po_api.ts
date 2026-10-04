import { db } from "../src/db";
import { purchaseOrders, purchaseOrderLines, items, vendors, organizations, vendorItems } from "../src/db/schema";
import { eq, and } from "drizzle-orm";

async function testApi() {
  const token = (await db.select({ publicToken: purchaseOrders.publicToken }).from(purchaseOrders).where(eq(purchaseOrders.poNumber, "PO-03_10_2026-03")))[0].publicToken;
  console.log(`Token: ${token}`);

  const [po] = await db
      .select({
        id: purchaseOrders.id,
        vendorId: purchaseOrders.vendorId,
      })
      .from(purchaseOrders)
      .where(eq(purchaseOrders.publicToken, token as string));
      
  const lines = await db
      .select({
        id: purchaseOrderLines.id,
        orderedQuantity: purchaseOrderLines.orderedQuantity,
        itemName: items.nameEn,
      })
      .from(purchaseOrderLines)
      .innerJoin(items, eq(purchaseOrderLines.itemId, items.id))
      .leftJoin(vendorItems, and(eq(vendorItems.itemId, purchaseOrderLines.itemId), eq(vendorItems.vendorId, po.vendorId)))
      .where(eq(purchaseOrderLines.poId, po.id));
      
  console.log(`Lines returned: ${lines.length}`);
  process.exit(0);
}

testApi().catch(console.error);
