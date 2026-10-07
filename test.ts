import 'dotenv/config';
import { db } from './src/db';
import { vendors, supplierInvoices } from './src/db/schema';
import { eq, sql } from 'drizzle-orm';
async function test() {
  const q = await db
    .select({
      vendorId: vendors.id,
      vendorName: vendors.name,
      orgId: vendors.organizationId,
      totalBilled: sql<number>`COALESCE(SUM(${supplierInvoices.totalAmount}), 0)`.as('totalBilled')
    })
    .from(vendors)
    .leftJoin(supplierInvoices, eq(vendors.id, supplierInvoices.vendorId))
    .groupBy(vendors.id);
  console.log('Results:', q);
}
test();
