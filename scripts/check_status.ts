import { db } from "../src/db";
import { purchaseOrders } from "../src/db/schema";

async function check() {
  const allPOs = await db.select().from(purchaseOrders);
  console.dir(allPOs.map(p => ({id: p.id, status: p.status})));
  process.exit(0);
}

check();
