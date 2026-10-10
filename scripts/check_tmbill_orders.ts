import { db } from '../src/db';
import { tmbillOrders } from '../src/db/schema';

async function check() {
  const orders = await db.select().from(tmbillOrders).limit(5);
  console.log(orders.map(o => ({ id: o.id, type: o.orderType, status: o.status })));
  process.exit(0);
}
check().catch(console.error);
