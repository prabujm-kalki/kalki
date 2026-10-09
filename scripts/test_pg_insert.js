const { Client } = require('pg');
const { randomUUID } = require('crypto');

async function testInsert() {
  const client = new Client({
    connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos'
  });
  
  await client.connect();
  
  const orgId = "b5334ab2-b652-432b-8c16-774c90406261";
  const locId = "467e6ec4-e7c0-4b24-8aeb-4e641f849da2";
  const customerId = randomUUID();
  const userId = "testuser";
  
  try {
    await client.query("BEGIN");
    
    await client.query(`
      INSERT INTO customers (id, organization_id, name, phone)
      VALUES ($1, $2, $3, $4)
    `, [customerId, orgId, 'Naveen', '9488409292']);
    
    await client.query(`
      INSERT INTO b2b_sales_invoices (
        id, organization_id, location_id, issue_date, total_amount, 
        tax_amount, invoice_number, invoice_date, customer_id, customer_name,
        subtotal_amount, discount_amount, taxable_amount, cgst_amount, sgst_amount,
        igst_amount, round_off_amount, grand_total, payment_status, payment_mode,
        tmbill_raw_data, created_user_id, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, 'ISSUED'
      )
    `, [
      randomUUID(), orgId, locId, new Date(), '1010.00',
      '0', 'TM-1g4amGizsN6niLsuSHlY0052-' + Date.now(), new Date(), customerId, 'Naveen',
      '1010.00', '0.00', '1010.00', '0.00', '0.00',
      '0.00', '0.00', '1010.00', 'PAID', 'Paytm',
      '{"test": "data"}', userId
    ]);
    
    console.log("Insert successful!");
    await client.query("ROLLBACK");
  } catch (err) {
    console.error("PG ERROR:", err.message);
    console.error("DETAIL:", err.detail);
    await client.query("ROLLBACK");
  } finally {
    await client.end();
  }
}

testInsert();
