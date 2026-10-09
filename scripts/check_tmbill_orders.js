const { Client } = require('pg');
async function run() {
  const c = new Client({ connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos' });
  await c.connect();
  const res = await c.query("SELECT DATE(order_date_time) as d, is_synced_to_finance, COUNT(*) FROM tmbill_orders WHERE location_id = '467e6ec4-e7c0-4b24-8aeb-4e641f849da2' AND order_date_time >= '2026-10-04' GROUP BY 1, 2 ORDER BY 1");
  console.log(res.rows);
  await c.end();
}
run();
