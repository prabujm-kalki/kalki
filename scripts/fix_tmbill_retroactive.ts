import { db } from '../src/db';
import { salesInvoiceLines, tmbillOrderItems, tmbillOrders, salesInvoices, itemCategories, items } from '../src/db/schema';
import { eq, and, like } from 'drizzle-orm';
import { randomUUID } from 'crypto';

async function fixExistingTMBillData() {
  const orgId = 'b5334ab2-b652-432b-8c16-774c90406261'; // Using the orgId from previous tasks
  
  console.log("Starting Retroactive TMBill Category Fix...");

  // 1. Get all TMBill synced invoice lines
  const linesToFix = await db.select({
    lineId: salesInvoiceLines.id,
    itemName: salesInvoiceLines.itemDescription,
    invoiceId: salesInvoiceLines.invoiceId,
    invoiceNumber: salesInvoices.invoiceNumber
  })
  .from(salesInvoiceLines)
  .innerJoin(salesInvoices, eq(salesInvoiceLines.invoiceId, salesInvoices.id))
  .where(and(
    eq(salesInvoices.organizationId, orgId),
    like(salesInvoices.invoiceNumber, 'TM-%')
  ));

  // Just fetch all TMBill orders and their items
  const allTMBillItems = await db.select({
    tmbillOrderId: tmbillOrders.tmbillOrderId,
    title: tmbillOrderItems.title,
    category: tmbillOrderItems.productGroupName
  })
  .from(tmbillOrderItems)
  .innerJoin(tmbillOrders, eq(tmbillOrderItems.orderId, tmbillOrders.id))
  .where(eq(tmbillOrders.organizationId, orgId));

  // Build a lookup map of Title -> Category
  const categoryMap = new Map();
  for (const item of allTMBillItems) {
    if (item.title && item.category) {
      categoryMap.set(item.title, item.category);
    }
  }

  let updatedCount = 0;

  // 2. Loop through lines and fix them
  for (const line of linesToFix) {
    // Only fix lines that came from TMBill (invoice number starts with TM-)
    if (line.invoiceNumber && line.invoiceNumber.startsWith('TM-')) {
      const categoryName = categoryMap.get(line.itemName) || 'POS Menu';
      
      // Find or create category
      let catId;
      const existingCat = await db.select().from(itemCategories).where(and(eq(itemCategories.organizationId, orgId), eq(itemCategories.name, categoryName))).limit(1);
      if (existingCat.length > 0) {
        catId = existingCat[0].id;
      } else {
        catId = randomUUID();
        await db.insert(itemCategories).values({
          id: catId,
          organizationId: orgId,
          name: categoryName,
          code: categoryName.substring(0, 5).toUpperCase()
        });
      }

      // Find or create item
      let actualItemId;
      const existingItem = await db.select().from(items).where(and(eq(items.organizationId, orgId), eq(items.nameEn, line.itemName))).limit(1);
      if (existingItem.length > 0) {
        actualItemId = existingItem[0].id;
        // Optionally update the category of the existing item to match TMBill
        await db.update(items).set({ categoryId: catId }).where(eq(items.id, actualItemId));
      } else {
        actualItemId = randomUUID();
        await db.insert(items).values({
          id: actualItemId,
          organizationId: orgId,
          locationId: 'd7f7131b-58e4-4e28-b83f-95a9b2e111a3',
          categoryId: catId,
          nameEn: line.itemName,
          nameTa: line.itemName,
          nameHi: line.itemName,
          currentPrice: "0",
          maxPrice: "0",
          unit: "NOS",
          baseMinStock: "0"
        } as any);
      }

      // Update the sales invoice line with the correct item ID
      await db.update(salesInvoiceLines)
        .set({ itemId: actualItemId })
        .where(eq(salesInvoiceLines.id, line.lineId));
      
      updatedCount++;
    }
  }

  console.log(`Successfully fixed ${updatedCount} existing TMBill sales lines.`);
  process.exit(0);
}

fixExistingTMBillData().catch(console.error);
