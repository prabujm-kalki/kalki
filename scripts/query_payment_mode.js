const { Client } = require('pg');
async function run() {
  const c = new Client({ connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos' });
  await c.connect();
  const res = await c.query(`SELECT payment_mode, payment_status FROM b2b_sales_invoices WHERE customer_name ILIKE '%manojkumar%' LIMIT 1;`);
  console.log(res.rows[0]);
  await c.end();
}
run();
