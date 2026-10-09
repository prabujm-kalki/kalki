const { Client } = require('pg');

async function findInvoices2() {
  const client = new Client({
    connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos'
  });
  await client.connect();
  
  const orgId = "b5334ab2-b652-432b-8c16-774c90406261";
  
  const tmbillRes = await client.query(`
    SELECT tmbill_order_id, tmbill_order_display_id, order_date_time 
    FROM tmbill_orders 
    WHERE organization_id = $1 
      AND order_date_time >= '2026-10-06 00:00:00' 
      AND order_date_time <= '2026-10-06 23:59:59'
    LIMIT 10
  `, [orgId]);
  const orderDisplayIds = tmbillRes.rows.map(r => r.tmbill_order_display_id);
  const orderIds = tmbillRes.rows.map(r => r.tmbill_order_id);
  
  console.log("Checking if they exist under display IDs but with different dates...");
  const b2bRes = await client.query(`
    SELECT invoice_number, issue_date 
    FROM b2b_sales_invoices 
    WHERE organization_id = $1 AND (invoice_number = ANY($2) OR invoice_number = ANY($3))
  `, [orgId, orderDisplayIds, orderIds.map(id => `TM-${id}`)]);
  
  console.log("B2B Invoices matching these display IDs/TMBill IDs:", b2bRes.rows);

  await client.end();
}
findInvoices2();
