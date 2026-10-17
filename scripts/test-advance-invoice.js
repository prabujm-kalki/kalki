require('dotenv').config();
const { Client } = require('pg');

async function testAdvanceDeduction() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  console.log('--- TEST: B2B CATERING INVOICE ADVANCE DEDUCTION & BALANCE DUE ---');

  // 1. Fetch sample org, location, customer
  const orgRes = await client.query(`SELECT id FROM organizations LIMIT 1`);
  const locRes = await client.query(`SELECT id FROM locations LIMIT 1`);
  const custRes = await client.query(`SELECT id, name FROM customers LIMIT 1`);

  const orgId = orgRes.rows[0].id;
  const locId = locRes.rows[0].id;
  const cust = custRes.rows[0];

  console.log('Context:', { orgId, locId, customer: cust.name });

  const { createB2BInvoice } = await import('../src/app/sales/actions.ts');

  // Test Case A: Advance Paid is Partial (Grand Total = ₹10,000, Advance = ₹3,000, Balance Due = ₹7,000)
  const payloadPartial = {
    organizationId: orgId,
    locationId: locId,
    customerId: cust.id,
    customerName: cust.name,
    items: [
      {
        id: '00000000-0000-0000-0000-000000000001',
        name: 'Wedding Catering Package (200 Pax)',
        qty: 200,
        rate: 50, // Subtotal 10,000
        discountPercent: 0,
        taxRate: 0,
        unit: 'PAX'
      }
    ],
    paymentTerms: 'Advance / Bank Transfer',
    overallDiscount: 0,
    advancePaid: 3000,
  };

  const resPartial = await createB2BInvoice(payloadPartial);
  console.log('Result Partial Invoice:', {
    invoiceNumber: resPartial.invoice.invoiceNumber,
    grandTotal: resPartial.invoice.grandTotal,
    advancePaid: resPartial.invoice.advancePaid,
    balanceDue: resPartial.invoice.balanceDue,
    paymentStatus: resPartial.invoice.paymentStatus,
    paymentMode: resPartial.invoice.paymentMode
  });

  if (Number(resPartial.invoice.advancePaid) !== 3000 || Number(resPartial.invoice.balanceDue) !== 7000 || resPartial.invoice.paymentStatus !== 'PARTIAL') {
    throw new Error('Partial advance math failed!');
  }

  // Test Case B: Advance Paid in Full (Grand Total = ₹5,000, Advance = ₹5,000, Balance Due = ₹0)
  const payloadFull = {
    ...payloadPartial,
    items: [{ ...payloadPartial.items[0], qty: 100, rate: 50 }], // 5000
    advancePaid: 5000,
  };

  const resFull = await createB2BInvoice(payloadFull);
  console.log('Result Full Advance Invoice:', {
    invoiceNumber: resFull.invoice.invoiceNumber,
    grandTotal: resFull.invoice.grandTotal,
    advancePaid: resFull.invoice.advancePaid,
    balanceDue: resFull.invoice.balanceDue,
    paymentStatus: resFull.invoice.paymentStatus,
  });

  if (Number(resFull.invoice.advancePaid) !== 5000 || Number(resFull.invoice.balanceDue) !== 0 || resFull.invoice.paymentStatus !== 'PAID') {
    throw new Error('Full advance math failed!');
  }

  console.log('--- ALL E2E INVOICE ADVANCE TESTS PASSED! ---');
  await client.end();
  process.exit(0);
}

testAdvanceDeduction().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
