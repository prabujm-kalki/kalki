const { db } = require('./src/db');
const { salesReturns } = require('./src/db/schema');

async function testInsert() {
  try {
    await db.insert(salesReturns).values({
      organizationId: 'b5334ab2-b652-432b-8c16-774c90406261',
      locationId: 'd7f7131b-58e4-4e28-b83f-95a9b2c111a3',
      returnNumber: 'RET-12345',
      invoiceId: '989cea1a-1bd4-4979-92b8-b4a59209b9ed',
      returnDate: new Date(),
      status: 'APPROVED',
      totalAmount: '225',
      reason: 'Damaged Item',
      createdUserId: 'system'
    });
    console.log("Success");
  } catch (err) {
    console.error("PG ERROR:", err);
  }
}

testInsert();
