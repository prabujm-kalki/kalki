const { Client } = require('pg');
async function run() {
  const c = new Client({ connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos' });
  await c.connect();
  const res = await c.query("SELECT DATE(issue_date) as d, COUNT(*) FROM b2b_sales_invoices GROUP BY 1 ORDER BY 1 DESC LIMIT 10");
  console.log(res.rows);
  await c.end();
}
run();
