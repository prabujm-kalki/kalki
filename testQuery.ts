import { db } from './src/db/index';
import { salesInvoices } from './src/db/schema';
import { eq, and, or, ilike, gte, lte } from 'drizzle-orm';

async function test() {
  const orgId = 'b5334ab2-b652-432b-8c16-774c90406261';
  const locId = 'd7f7131b-58e4-4e28-b83f-95a9b2e111a3';
  const searchQuery = 'tr';
  const whereClause = and(
    eq(salesInvoices.organizationId, orgId),
    eq(salesInvoices.locationId, locId),
    eq(salesInvoices.paymentStatus, 'PAID'),
    ...(searchQuery
      ? [
          or(
            ilike(salesInvoices.invoiceNumber, `%${searchQuery}%`),
            ilike(salesInvoices.customerName, `%${searchQuery}%`)
          ),
        ]
      : [])
  );
  const result = await db.select().from(salesInvoices).where(whereClause).limit(5);
  console.log(result.map(r => r.customerName));
  process.exit(0);
}
test();
