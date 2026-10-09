const { Client } = require('pg');

async function run() {
  const client = new Client({ connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos' });
  await client.connect();
  
  const receipts = await client.query('SELECT count(*) FROM sales_receipts');
  console.log('Receipts count:', receipts.rows[0].count);

  const paidInvoices = await client.query("SELECT sum(grand_total) FROM b2b_sales_invoices WHERE payment_status='PAID'");
  console.log('Paid invoices sum:', paidInvoices.rows[0].sum);
  
  await client.end();
}
run();
