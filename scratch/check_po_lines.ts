import { db } from "../src/db";
import { purchaseOrders, purchaseOrderLines } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function run() {
  const pos = await db.select().from(purchaseOrders).where(eq(purchaseOrders.status, 'pending_approval'));
  console.log(`Found ${pos.length} pending_approval POs`);
  for (const po of pos) {
    console.log(`PO ID: ${po.id}, PO Number: ${po.poNumber}`);
    const lines = await db.select().from(purchaseOrderLines).where(eq(purchaseOrderLines.poId, po.id));
    console.log(`  Lines: ${lines.length}`);
    lines.forEach(l => console.log(`  - ItemID: ${l.itemId}, Qty: ${l.orderedQuantity}`));
  }
  process.exit(0);
}

run().catch(console.error);
