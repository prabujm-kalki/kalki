import { db } from '../src/db';
import { tmbillOrderItems, tmbillOrders, itemCategories } from '../src/db/schema';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';

async function syncCats() {
  const orgId = 'b5334ab2-b652-432b-8c16-774c90406261';
  
  const allTMBillItems = await db.select({
    title: tmbillOrderItems.title,
    category: tmbillOrderItems.productGroupName
  })
  .from(tmbillOrderItems)
  .innerJoin(tmbillOrders, eq(tmbillOrderItems.orderId, tmbillOrders.id))
  .where(eq(tmbillOrders.organizationId, orgId));

  const uniqueCats = new Set<string>();
  for (const item of allTMBillItems) {
    if (item.category) uniqueCats.add(item.category);
  }
  
  for (const catName of uniqueCats) {
    const existing = await db.select().from(itemCategories).where(and(eq(itemCategories.organizationId, orgId), eq(itemCategories.name, catName))).limit(1);
    if (existing.length === 0) {
      await db.insert(itemCategories).values({
        id: randomUUID(),
        organizationId: orgId,
        name: catName,
        code: catName.substring(0, 5).toUpperCase()
      });
      console.log('Created category:', catName);
    }
  }
  
  console.log('Done syncing missing categories.');
  process.exit(0);
}
syncCats().catch(console.error);
