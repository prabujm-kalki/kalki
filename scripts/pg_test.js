const { Client } = require('pg');

async function testQuery() {
  const client = new Client({
    connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos'
  });
  
  await client.connect();
  
  const orgId = "b5334ab2-b652-432b-8c16-774c90406261";
  const locId = "467e6ec4-e7c0-4b24-8aeb-4e641f849da2";
  
  const res = await client.query(`SELECT id, issue_date, grand_total, customer_name, location_id FROM b2b_sales_invoices WHERE organization_id = $1`, [orgId]);
  console.log("ALL INVOICES:", res.rows);
  
  await client.end();
}

testQuery();
