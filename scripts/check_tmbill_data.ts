import { db } from '../src/db';
import { tmbillOrderItems } from '../src/db/schema';
import { eq, like, isNotNull } from 'drizzle-orm';

async function check() {
  const itemsFood = await db.select().from(tmbillOrderItems).where(eq(tmbillOrderItems.productGroupName, 'Food')).limit(10);
  console.log('Food Items in TMBill:', itemsFood.map(i => i.title));

  const itemsNonVeg = await db.select().from(tmbillOrderItems).where(like(tmbillOrderItems.productGroupName, '%Non Veg%')).limit(10);
  console.log('Non Veg Items in TMBill:', itemsNonVeg.map(i => ({ title: i.title, group: i.productGroupName })));
  
  process.exit(0);
}
check().catch(console.error);
