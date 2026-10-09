const { Client } = require('pg');
async function run() {
  const c = new Client({ connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos' });
  await c.connect();
  const res = await c.query("SELECT location_id, DATE(order_date_time) as d, is_synced_to_finance, COUNT(*) FROM tmbill_orders WHERE order_date_time >= '2026-10-04' GROUP BY 1, 2, 3 ORDER BY 2");
  console.log(res.rows);
  await c.end();
}
run();
