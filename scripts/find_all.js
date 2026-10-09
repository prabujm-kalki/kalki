const { Client } = require('pg');

async function findInvoices() {
  const client = new Client({
    connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos'
  });
  await client.connect();
  
  const orgId = "b5334ab2-b652-432b-8c16-774c90406261";
  
  const b2bRes = await client.query(`
    SELECT id, invoice_number, issue_date, tmbill_raw_data->>'order_id' as tmbill_id
    FROM b2b_sales_invoices 
    WHERE organization_id = $1 
      AND tmbill_raw_data IS NOT NULL
  `, [orgId]);
  
  console.log("Total TMBill invoices in Finance:", b2bRes.rows.length);
  
  const missing = b2bRes.rows.filter(r => r.tmbill_id === '1g4amrgwLI9MOPtDyzTT4970' || r.tmbill_id === '1g4am9DSSpKW9y7Duaks2216');
  console.log("Missing oct 6th orders found in b2b?:", missing);
  
  const tmRes = await client.query(`
    SELECT count(*) FROM tmbill_orders WHERE is_synced_to_finance = true
  `);
  console.log("Total TMBill orders marked true:", tmRes.rows[0].count);

  await client.end();
}
findInvoices();
