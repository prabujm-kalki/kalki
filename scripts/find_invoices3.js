const { Client } = require('pg');

async function findInvoices3() {
  const client = new Client({
    connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos'
  });
  await client.connect();
  
  const orgId = "b5334ab2-b652-432b-8c16-774c90406261";
  
  const b2bRes = await client.query(`
    SELECT invoice_number, issue_date 
    FROM b2b_sales_invoices 
    WHERE organization_id = $1 
      AND created_at >= '2026-10-07 10:00:00' 
      AND created_at <= '2026-10-07 15:00:00'
  `, [orgId]);
  
  console.log("B2B Invoices created during the sync window:", b2bRes.rows);

  await client.end();
}
findInvoices3();
