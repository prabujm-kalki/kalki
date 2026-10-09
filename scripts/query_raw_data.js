const { Client } = require('pg');
async function run() {
  const c = new Client({ connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos' });
  await c.connect();
  // Fetch Manojkumar's invoice raw data
  const res = await c.query(`SELECT raw_data FROM tmbill_orders WHERE customer_name ILIKE '%manojkumar%' LIMIT 1;`);
  console.log(JSON.stringify(res.rows[0], null, 2));
  await c.end();
}
run();
