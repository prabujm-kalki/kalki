import { db } from './src/db';
import { salesInvoices, salesInvoiceLines, items, itemCategories } from './src/db/schema';
import { eq, and, sql, gte, lte } from 'drizzle-orm';

async function test() {
  const orgId = 'b5334ab2-b652-432b-8c16-774c90406261';
  
  let startObj = new Date('2026-10-01');
  startObj.setUTCHours(0, 0, 0, 0);
  let endObj = new Date('2026-10-10');
  endObj.setUTCHours(23, 59, 59, 999);

  const baseQuery = db.select({
      itemId: sql<string>`MAX(CAST(${salesInvoiceLines.id} AS TEXT))`,
      itemCode: salesInvoiceLines.itemDescription,
      itemName: salesInvoiceLines.itemDescription,
      categoryName: sql<string>`COALESCE(${itemCategories.name}, 'Menu Item')`,
      uom: sql<string>`COALESCE(${salesInvoiceLines.uom}, 'Nos')`,
      totalQtySold: sql<number>`COALESCE(SUM(CAST(${salesInvoiceLines.quantity} AS NUMERIC)), 0)`,
      netRevenue: sql<number>`COALESCE(SUM(CAST(${salesInvoiceLines.lineTotal} AS NUMERIC)), 0)`
    })
    .from(salesInvoiceLines)
    .innerJoin(salesInvoices, eq(salesInvoiceLines.invoiceId, salesInvoices.id))
    .leftJoin(items, eq(salesInvoiceLines.itemId, items.id))
    .leftJoin(itemCategories, eq(items.categoryId, itemCategories.id))
    .where(and(
      eq(salesInvoices.organizationId, orgId),
      gte(salesInvoices.invoiceDate, startObj),
      lte(salesInvoices.invoiceDate, endObj),
      sql`${salesInvoices.status} != 'CANCELLED'`,
      sql`COALESCE(${itemCategories.name}, '') NOT ILIKE '%food cost%'`
    ))
    .groupBy(
      salesInvoiceLines.itemDescription, 
      itemCategories.name, 
      salesInvoiceLines.uom
    )
    .limit(10);

    try {
      const res = await baseQuery;
      console.log('Result length:', res.length);
      console.log('Result:', res);
    } catch(e) {
      console.error(e);
    }
    process.exit(0);
}
test();
