const { Client } = require('pg');
async function run() {
  const c = new Client({ connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos' });
  await c.connect();
  try {
    const res = await c.query(`SELECT status, count(*) FROM b2b_sales_invoices GROUP BY status;`);
    console.log('Statuses:', res.rows);
  } catch(e) {}
  await c.end();
}
run();
