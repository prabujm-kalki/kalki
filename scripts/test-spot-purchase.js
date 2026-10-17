require('dotenv').config();
const { Client } = require('pg');

async function testPhase2() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  console.log('--- TEST PHASE 2: ATOMIC TRANSACTIONS & EX-ANTE RULES ---');

  // 1. Fetch real org, location, and test item
  const itemRes = await client.query(`SELECT id, organization_id, location_id, name_en, unit FROM items LIMIT 1`);
  if (!itemRes.rows.length) {
    throw new Error('No items found in DB');
  }
  const testItem = itemRes.rows[0];
  console.log('Test Item:', testItem.name_en, '(', testItem.id, ')');

  // Ensure item has allow_spot_purchase = true and price limit = 1000
  await client.query(`
    UPDATE items 
    SET allow_spot_purchase = true, spot_purchase_price_limit = '1000.00', is_inventory_tracked = true
    WHERE id = $1
  `, [testItem.id]);
  console.log('Configured test item for spot purchase.');

  // Upsert branch policy
  await client.query(`
    INSERT INTO branch_purchase_policies (organization_id, location_id, max_spot_purchase_transaction_limit, max_daily_spot_purchase_total, max_item_daily_frequency, require_photo_evidence)
    VALUES ($1, $2, '2000.00', '5000.00', 3, true)
    ON CONFLICT DO NOTHING
  `, [testItem.organization_id, testItem.location_id]);
  console.log('Ensured branch purchase policy exists.');

  // Fetch a user
  const userRes = await client.query(`SELECT id FROM "user" LIMIT 1`);
  const userId = userRes.rows.length ? userRes.rows[0].id : 'system-test-user';

  // Import actions and run executeQuickPurchase
  const { executeQuickPurchase, auditSpotPurchase } = await import('../src/app/purchasing/actions.ts');

  // Test 1: Successful quick purchase
  const purchasePayload = {
    organizationId: testItem.organization_id,
    locationId: testItem.location_id,
    itemId: testItem.id,
    vendorName: 'Local Market / Sundar Stores',
    quantity: 5,
    uom: testItem.unit,
    unitPrice: 50,
    totalAmount: 250,
    paymentSource: 'PETTY_CASH',
    receiptPhotoUrl: 'https://storage.kalkibos.com/receipts/test-slip.jpg',
    submittedByUserId: userId,
    notes: 'Emergency morning purchase for breakfast prep',
  };

  console.log('Executing Quick Purchase with payload:', purchasePayload);
  const result = await executeQuickPurchase(purchasePayload);
  console.log('Quick Purchase Record Created:', result.voucherNumber, 'ID:', result.id, 'Status:', result.auditStatus);

  // Test 2: Verify Audit action
  const audited = await auditSpotPurchase(
    result.id,
    testItem.organization_id,
    testItem.location_id,
    'AUDITED_CLEARED',
    userId,
    'Verified receipt slip and physical stock match'
  );
  console.log('Audited Record Status:', audited.auditStatus, 'Notes:', audited.auditNotes);

  // Test 3: Ex-Ante Rule Enforcement (Amount exceeding item price cap)
  try {
    await executeQuickPurchase({
      ...purchasePayload,
      unitPrice: 300,
      totalAmount: 1500, // Exceeds 1000 cap
    });
    console.error('FAILED: Expected Ex-Ante price limit error did not trigger!');
    process.exit(1);
  } catch (err) {
    console.log('SUCCESS: Ex-Ante price limit blocked violation correctly:', err.message);
  }

  console.log('--- ALL PHASE 2 TESTS PASSED PERFECTLY ---');
  await client.end();
  process.exit(0);
}

testPhase2().catch(err => {
  console.error('Phase 2 test failed with error:', err);
  process.exit(1);
});
