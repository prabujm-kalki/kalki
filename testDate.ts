import { db } from './src/db/index';
import { salesInvoices } from './src/db/schema';
import { eq, and, or, ilike, gte, lte } from 'drizzle-orm';

async function test() {
  const orgId = 'b5334ab2-b652-432b-8c16-774c90406261';
  const locId = 'd7f7131b-58e4-4e28-b83f-95a9b2e111a3';
  
  const startDate = new Date('2026-09-01');
  const endDate = new Date('2026-09-30');
  
  const whereClause = and(
    eq(salesInvoices.organizationId, orgId),
    eq(salesInvoices.locationId, locId),
    eq(salesInvoices.paymentStatus, 'PAID'),
    gte(salesInvoices.invoiceDate, startDate as any),
    lte(salesInvoices.invoiceDate, endDate as any)
  );
  
  const result = await db.select().from(salesInvoices).where(whereClause).limit(5);
  console.log('Results in September:', result.length);
  process.exit(0);
}
test();
