require('dotenv').config({ path: '.env.local' });
const { db } = require('./src/db');
const { customers, salesInvoices, salesReceipts, salesCreditNotes } = require('./src/db/schema');
const { eq, sql } = require('drizzle-orm');

async function test() {
  const orgId = "6a42ab1d-212d-45db-9c32-15f5fc8c5fcb"; // Prabujm organization id usually
  try {
    const query = await db
      .select({
        customerId: customers.id,
        totalInvoiced: sql`COALESCE(SUM(${salesInvoices.totalAmount}::NUMERIC), 0)`.as('totalInvoiced'),
      })
      .from(customers)
      .leftJoin(salesInvoices, eq(customers.id, salesInvoices.customerId))
      // .where(eq(customers.organizationId, orgId))
      .groupBy(customers.id);
      
    console.log("Customer Balances:", query);
  } catch(e) {
    console.error(e);
  }
}
test();
