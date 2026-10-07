import { db } from "./src/db";
import { purchaseOrders, purchaseOrderLines } from "./src/db/schema";
import { eq } from "drizzle-orm";

async function run() {
  const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.poNumber, 'Chicken_shop-07_10_2026-03'));
  if (!po) {
    console.log("PO not found");
    return;
  }
  const lines = await db.select().from(purchaseOrderLines).where(eq(purchaseOrderLines.poId, po.id));
  console.log("PO:", po);
  console.log("Lines:", lines);
  process.exit(0);
}

run();
