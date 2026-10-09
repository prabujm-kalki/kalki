const { Client } = require('pg');
const { randomUUID } = require('crypto');

async function run() {
  const client = new Client({ connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos' });
  await client.connect();
  
  console.log("Starting backfill for missing receipts...");
  
  try {
    const invoices = await client.query("SELECT * FROM b2b_sales_invoices WHERE payment_status='PAID'");
    console.log(`Found ${invoices.rows.length} PAID invoices.`);
    
    let inserted = 0;
    
    for (const inv of invoices.rows) {
      const existing = await client.query("SELECT id FROM sales_receipts WHERE receipt_number = $1", [`REC-${inv.invoice_number}`]);
      
      if (existing.rows.length === 0) {
        await client.query(`
          INSERT INTO sales_receipts (id, organization_id, location_id, customer_id, receipt_number, receipt_date, amount, payment_method, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        `, [
          randomUUID(),
          inv.organization_id,
          inv.location_id,
          inv.customer_id,
          `REC-${inv.invoice_number}`,
          inv.invoice_date || new Date(),
          inv.grand_total || inv.total_amount || 0,
          inv.payment_mode || "SYSTEM_SYNC_BACKFILL"
        ]);
        inserted++;
      }
    }
    
    console.log(`Successfully backfilled ${inserted} missing receipts.`);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
