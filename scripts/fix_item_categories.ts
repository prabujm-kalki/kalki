import { db } from '../src/db';
import { tmbillOrderItems, items, itemCategories, tmbillOrders } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

async function fix() {
  const orgId = 'b5334ab2-b652-432b-8c16-774c90406261';

  // 1. Build a better Map, preferring non-'Food' categories, and using newest.
  const allTMBillItems = await db.select({
    title: tmbillOrderItems.title,
    category: tmbillOrderItems.productGroupName,
    createdAt: tmbillOrderItems.createdAt
  })
  .from(tmbillOrderItems)
  .innerJoin(tmbillOrders, eq(tmbillOrderItems.orderId, tmbillOrders.id))
  .where(eq(tmbillOrders.organizationId, orgId))
  .orderBy(tmbillOrderItems.createdAt);

  const categoryMap = new Map<string, string>();
  for (const item of allTMBillItems) {
    if (!item.title || !item.category) continue;
    
    const existingCat = categoryMap.get(item.title);
    // If it's 'Food', only set it if we don't already have a better one
    if (item.category === 'Food' && existingCat && existingCat !== 'Food') {
      continue;
    }
    
    categoryMap.set(item.title, item.category);
  }

  // 2. Fetch all Kalki master categories to get their IDs
  const allKalkiCats = await db.select().from(itemCategories).where(eq(itemCategories.organizationId, orgId));
  const catIdMap = new Map<string, string>();
  for (const c of allKalkiCats) {
    catIdMap.set(c.name, c.id);
  }

  // 3. Update items
  const allItems = await db.select().from(items).where(eq(items.organizationId, orgId));
  let updated = 0;

  for (const item of allItems) {
    const correctCatName = categoryMap.get(item.nameEn);
    if (correctCatName && correctCatName !== 'Food') {
      let catId = catIdMap.get(correctCatName);
      
      // Safety: create category if it somehow doesn't exist
      if (!catId) {
        catId = randomUUID();
        await db.insert(itemCategories).values({
          id: catId,
          organizationId: orgId,
          name: correctCatName,
          code: correctCatName.substring(0, 5).toUpperCase()
        });
        catIdMap.set(correctCatName, catId);
      }

      // Only update if it's different
      if (item.categoryId !== catId) {
        await db.update(items).set({ categoryId: catId }).where(eq(items.id, item.id));
        updated++;
      }
    }
  }

  console.log(`Successfully re-mapped ${updated} items to correct non-Food categories.`);
  process.exit(0);
}

fix().catch(console.error);
