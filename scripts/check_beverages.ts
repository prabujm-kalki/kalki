import { db } from '../src/db';
import { tmbillOrderItems } from '../src/db/schema';
import { like } from 'drizzle-orm';

async function check() {
  const bevItems = await db.select({ title: tmbillOrderItems.title, group: tmbillOrderItems.productGroupName }).from(tmbillOrderItems).where(like(tmbillOrderItems.productGroupName, '%everage%'));
  if (bevItems.length === 0) {
    console.log('No items found with category containing beverage');
  } else {
    console.log('Found in category:', new Set(bevItems.map(i => i.title + ' -> ' + i.group)));
  }

  const titleBev = await db.select({ title: tmbillOrderItems.title, group: tmbillOrderItems.productGroupName }).from(tmbillOrderItems).where(like(tmbillOrderItems.title, '%everage%'));
  if (titleBev.length === 0) {
    console.log('No titles found containing beverage');
  } else {
    console.log('Found in title:', new Set(titleBev.map(i => i.title + ' -> ' + i.group)));
  }

  process.exit(0);
}
check().catch(console.error);
