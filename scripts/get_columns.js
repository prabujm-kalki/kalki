const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const res = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'tmbill_orders'`);
  console.log(res.rows.map(r => r.column_name).join(', '));
  pool.end();
}
run();
