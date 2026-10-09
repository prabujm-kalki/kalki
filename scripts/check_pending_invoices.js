const { Client } = require('pg');
async function run() {
  const c = new Client({ connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos' });
  await c.connect();
  const res = await c.query("SELECT location_id, customer_name, grand_total, payment_status, tmbill_raw_data IS NOT NULL as is_tmbill FROM b2b_sales_invoices WHERE payment_status = 'PENDING'");
  console.log(JSON.stringify(res.rows, null, 2));
  await c.end();
}
run();
