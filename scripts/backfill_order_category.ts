import { db } from '../src/db';
import { salesInvoices, tmbillOrders } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function backfill() {
  const invoices = await db.select({
    id: salesInvoices.id,
    orderCategory: salesInvoices.orderCategory,
    tmbillRawData: salesInvoices.tmbillRawData
  }).from(salesInvoices);

  let updatedCount = 0;

  for (const inv of invoices) {
    if (inv.orderCategory) continue; // Already set

    let category = 'Dine-in';
    const rawData = inv.tmbillRawData as any;
    if (rawData) {
      if (rawData.table_name && rawData.table_name.toLowerCase().includes('parcel')) {
        category = 'Parcel';
      } else if (rawData.table_name && rawData.table_name.toLowerCase().includes('takeaway')) {
        category = 'Takeaway';
      }
    } else {
      // Try to find the associated tmbillOrder
      const tOrder = await db.select().from(tmbillOrders).where(eq(tmbillOrders.financeSalesInvoiceId, inv.id)).limit(1);
      if (tOrder.length > 0) {
        const tr = tOrder[0].rawData as any;
        if (tr) {
          if (tr.table_name && tr.table_name.toLowerCase().includes('parcel')) {
            category = 'Parcel';
          } else if (tr.table_name && tr.table_name.toLowerCase().includes('takeaway')) {
            category = 'Takeaway';
          }
        }
      }
    }

    await db.update(salesInvoices).set({ orderCategory: category }).where(eq(salesInvoices.id, inv.id));
    updatedCount++;
  }

  console.log(`Updated ${updatedCount} invoices`);
  process.exit(0);
}
backfill().catch(console.error);
