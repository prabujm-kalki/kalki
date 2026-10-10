import { db } from './src/db';
import { salesInvoices, salesInvoiceLines } from './src/db/schema';
import { eq, sql } from 'drizzle-orm';

async function test() {
  const orgId = 'b5334ab2-b652-432b-8c16-774c90406261';
  try {
    const list = await db.select({
      id: salesInvoices.id,
      status: salesInvoices.status,
      paymentStatus: salesInvoices.paymentStatus,
      invoiceDate: salesInvoices.invoiceDate,
      lineId: salesInvoiceLines.id,
      itemDescription: salesInvoiceLines.itemDescription
    })
    .from(salesInvoiceLines)
    .innerJoin(salesInvoices, eq(salesInvoiceLines.invoiceId, salesInvoices.id))
    .where(eq(salesInvoices.organizationId, orgId))
    .limit(5);

    console.log('Result length:', list.length);
    console.log('Result:', list);
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}
test();
