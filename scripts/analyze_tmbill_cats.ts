import { db } from '../src/db';
import { tmbillOrderItems, tmbillOrders, itemCategories } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function analyze() {
  const orgId = 'b5334ab2-b652-432b-8c16-774c90406261';
  
  const allTMBillItems = await db.select({
    title: tmbillOrderItems.title,
    category: tmbillOrderItems.productGroupName
  })
  .from(tmbillOrderItems)
  .innerJoin(tmbillOrders, eq(tmbillOrderItems.orderId, tmbillOrders.id))
  .where(eq(tmbillOrders.organizationId, orgId));

  const uniqueCats = new Set();
  for (const item of allTMBillItems) {
    if (item.category) uniqueCats.add(item.category);
  }
  
  console.log('TMBill distinct categories:', Array.from(uniqueCats));

  const allKalkiCats = await db.select({
    name: itemCategories.name
  })
  .from(itemCategories)
  .where(eq(itemCategories.organizationId, orgId));

  console.log('Kalki master categories:', allKalkiCats.map(c => c.name));

  process.exit(0);
}
analyze().catch(console.error);
