const { db } = require('./src/db/index.js');
const { salesInvoices } = require('./src/db/schema.js');
const { eq, and, or, ilike } = require('drizzle-orm');

async function test() {
  const orgId = 'b5334ab2-b652-432b-8c16-774c90406261';
  const q = 'tr';
  const result = await db.select().from(salesInvoices).where(
    and(
      eq(salesInvoices.organizationId, orgId),
      ...(q ? [or(
          ilike(salesInvoices.invoiceNumber, `%${q}%`),
          ilike(salesInvoices.customerName, `%${q}%`)
      )] : [])
    )
  ).limit(5);
  console.log(result.map(r => r.customerName));
  process.exit(0);
}
test();
