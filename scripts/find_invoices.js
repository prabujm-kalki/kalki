const { Client } = require('pg');

async function findInvoices() {
  const client = new Client({
    connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos'
  });
  await client.connect();
  
  const orgId = "b5334ab2-b652-432b-8c16-774c90406261";
  
  const b2bRes = await client.query(`
    SELECT invoice_number, issue_date 
    FROM b2b_sales_invoices 
    WHERE invoice_number IN ('1', '2', '5', '6', '23', '25', '27', '28', '29', '19', 'TM-1g4amrgwLI9MOPtDyzTT4970', 'TM-1g4amq0Ov0kjUIyNH4XG0414', 'TM-1g4amJCazyy0q4IRJpyx3459')
  `);
  
  console.log("B2B Invoices matching these display IDs/TMBill IDs:", b2bRes.rows);

  await client.end();
}
findInvoices();
