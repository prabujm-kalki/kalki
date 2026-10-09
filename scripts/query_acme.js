const { Client } = require('pg');
async function run() {
  const client = new Client({ connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos' });
  await client.connect();
  const res = await client.query("SELECT * FROM customers WHERE name ILIKE '%acme%'");
  const acme = res.rows[0];
  console.log('Customer:', acme);
  
  if (acme) {
    const invoices = await client.query("SELECT * FROM b2b_sales_invoices WHERE customer_id=$1", [acme.id]);
    console.log('Invoices:', invoices.rows.map(i => ({ id: i.id, grand_total: i.grand_total, payment_status: i.payment_status })));
    
    const receipts = await client.query("SELECT * FROM sales_receipts WHERE customer_id=$1", [acme.id]);
    console.log('Receipts:', receipts.rows.map(r => ({ id: r.id, amount: r.amount, method: r.payment_method })));
    
    const credits = await client.query("SELECT * FROM credit_notes WHERE customer_id=$1", [acme.id]);
    console.log('Credit Notes:', credits.rows.map(c => ({ id: c.id, amount: c.total_amount, rem: c.remaining_balance })));
  }
  
  await client.end();
}
run();
