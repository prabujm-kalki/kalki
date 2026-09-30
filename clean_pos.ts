import { db } from "./src/db";
import { purchaseOrders, purchaseOrderLines } from "./src/db/schema";

async function main() {
  await db.delete(purchaseOrderLines);
  await db.delete(purchaseOrders);
  console.log("Cleaned seeded POs");
}

main().catch(console.error).then(() => process.exit(0));
