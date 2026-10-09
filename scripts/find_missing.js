const { Client } = require('pg');

async function findMissing() {
  const client = new Client({
    connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos'
  });
  await client.connect();
  
  const orgId = "b5334ab2-b652-432b-8c16-774c90406261";
  
  console.log("Checking all invoices for Oct 6 regardless of number...");
  const b2bRes = await client.query(`
    SELECT invoice_number, issue_date 
    FROM b2b_sales_invoices 
    WHERE organization_id = $1 
      AND issue_date >= '2026-10-06 00:00:00' 
      AND issue_date <= '2026-10-06 23:59:59'
  `, [orgId]);
  
  console.log("B2B Invoices on Oct 6:", b2bRes.rows);
  
  const tmbillRes = await client.query(`
    SELECT tmbill_order_display_id, tmbill_order_id, order_date_time, created_at
    FROM tmbill_orders 
    WHERE organization_id = $1 
      AND order_date_time >= '2026-10-06 00:00:00' 
      AND order_date_time <= '2026-10-06 23:59:59'
    LIMIT 10
  `, [orgId]);
  console.log("TMBill Orders for Oct 6:", tmbillRes.rows);

  await client.end();
}
findMissing();
