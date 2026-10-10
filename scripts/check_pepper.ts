import { db } from '../src/db';
import { tmbillOrderItems, items, itemCategories, salesInvoiceLines } from '../src/db/schema';
import { eq, like, and } from 'drizzle-orm';

async function check() {
  const allPepper = await db.select({ title: tmbillOrderItems.title, group: tmbillOrderItems.productGroupName }).from(tmbillOrderItems).where(like(tmbillOrderItems.title, '%Pepper%'));
  console.log('TMBill mappings:', new Set(allPepper.map(i => i.title + ' -> ' + i.group)));

  const itemsPepper = await db.select({ name: items.nameEn, catName: itemCategories.name }).from(items).innerJoin(itemCategories, eq(items.categoryId, itemCategories.id)).where(like(items.nameEn, '%Pepper%'));
  console.log('Master Items:', itemsPepper);
  
  process.exit(0);
}
check().catch(console.error);
