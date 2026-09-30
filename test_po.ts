import { createPurchaseOrder } from './src/domains/inventory/service';
import { db } from './src/db';
import { users } from './src/db/schema';

async function q() {
  const [u] = await db.select().from(users).limit(1);
  try {
    const po = await createPurchaseOrder(u as any, {
      organizationId: '15d2d5c5-e9ba-4996-8c27-73161d633857',
      locationId: '7da984b9-fb0a-4cf2-92e5-053268c86255',
      vendorId: '9453d1a8-6ab1-4440-a673-7c3780fcfb62',
      paymentMethod: 'credit',
      lines: [{
        itemId: '58db5060-221e-4c98-8b22-bc3b67b1d11c',
        orderedQuantity: 1,
        unitRate: 0
      }]
    });
    console.log('success', po);
  } catch(e: any) {
    console.error('ERROR:', e.message);
  }
  process.exit(0);
}
q();
