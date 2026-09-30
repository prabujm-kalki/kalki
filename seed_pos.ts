import { db } from "./src/db";
import { organizations, locations, vendors, purchaseOrders, items, purchaseOrderLines } from "./src/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const orgs = await db.select().from(organizations).limit(1);
  if (orgs.length === 0) {
    console.log("No organization found");
    return;
  }
  const orgId = orgs[0].id;

  const locs = await db.select().from(locations).where(eq(locations.organizationId, orgId)).limit(1);
  const locId = locs[0].id;

  let vendorList = await db.select().from(vendors).limit(1);
  if (vendorList.length === 0) {
    console.log("No vendors found");
    return;
  }
  const vendorId = vendorList[0].id;

  const itemList = await db.select().from(items).limit(2);
  if (itemList.length === 0) {
    console.log("No items found");
    return;
  }

  console.log("Creating Purchase Orders...");

  const posToInsert = [
    { total: "15000", status: "approved", daysAgo: 5 },
    { total: "22500", status: "approved", daysAgo: 2 },
    { total: "5400", status: "draft", daysAgo: 0 },
  ];

  for (const poData of posToInsert) {
    const d = new Date();
    d.setDate(d.getDate() - poData.daysAgo);

    const [po] = await db.insert(purchaseOrders).values({
      organizationId: orgId,
      locationId: locId,
      vendorId: vendorId,
      status: poData.status,
      totalAmount: poData.total,
      paymentMethod: "credit",
      createdAt: d,
      updatedAt: d
    }).returning();

    for (const item of itemList) {
      await db.insert(purchaseOrderLines).values({
        poId: po.id,
        itemId: item.id,
        orderedQuantity: "10",
        unitRate: "50",
        createdAt: d
      });
    }
  }

  console.log("Successfully seeded 3 real purchase orders!");
}

main().catch(console.error).then(() => process.exit(0));
