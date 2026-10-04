import { db } from "@/db";
import { purchaseOrders, purchaseOrderLines } from "@/db/schema";
import { eq } from "drizzle-orm";

async function run() {
  const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.poNumber, "Sakthi-03_10_2026-03"));
  if (po) {
    console.log("PO:", po);
    const lines = await db.select().from(purchaseOrderLines).where(eq(purchaseOrderLines.poId, po.id));
    console.log("Lines:", lines);
  }
  process.exit(0);
}
run();
