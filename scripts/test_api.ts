import { db } from './src/db';
import { purchaseOrders, purchaseOrderLines, vendorItems } from './src/db/schema';
import crypto from 'crypto';
import { eq, inArray, and } from 'drizzle-orm';

async function test() {
  const vendorId = '9453d1a8-6ab1-4440-a673-7c3780fcfb62';
  const locationId = '7da984b9-fb0a-4cf2-92e5-053268c86255';
  const organizationId = '15d2d5c5-e9ba-4996-8c27-73161d633857';
  const stockInputs = [{ itemId: '58db5060-221e-4c98-8b22-bc3b67b1d11c', currentStock: 4 }];
  
  const itemIds = stockInputs.map(i => i.itemId);
  const configuredItems = await db
      .select()
      .from(vendorItems)
      .where(
        and(
          eq(vendorItems.vendorId, vendorId),
          inArray(vendorItems.itemId, itemIds),
          eq(vendorItems.isActive, true)
        )
      );
      
  const itemsToOrder = [];
  let totalAmount = 0;

  for (const input of stockInputs) {
      const conf = configuredItems.find(c => c.itemId === input.itemId);
      if (conf && conf.minimumStock !== null && conf.minimumStock !== undefined) {
        if (input.currentStock <= Number(conf.minimumStock)) {
          // Trigger order
          // Calculate order quantity: (normalQuantity or minimumStock) - currentStock
          // Wait! Let's check what the API does.
          const target = conf.normalQuantity ? Number(conf.normalQuantity) : Number(conf.minimumStock) * 2;
          const orderQuantity = target - input.currentStock > 0 ? target - input.currentStock : 1;
          const lastRate = conf.lastRate ? Number(conf.lastRate) : 0;
          
          itemsToOrder.push({
            itemId: input.itemId,
            itemName: conf.itemName,
            unitOfMeasure: conf.unitOfMeasure,
            orderedQuantity: orderQuantity.toString(),
            unitRate: lastRate.toString(),
          });
          totalAmount += orderQuantity * lastRate;
        }
      }
    }
    
    console.log("Items to order:", itemsToOrder);

    const publicToken = crypto.randomBytes(16).toString('hex');
    try {
      const [newPo] = await db.insert(purchaseOrders).values({
        organizationId: organizationId,
        locationId: locationId,
        vendorId: vendorId,
        status: "DRAFT",
        totalAmount: totalAmount.toString(),
        publicToken: publicToken,
      }).returning();
      console.log("PO Created:", newPo);
    } catch (e) {
      console.error("ERROR CREATING PO:", e);
    }
}

test().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
