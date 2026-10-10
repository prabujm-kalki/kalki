const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function run() {
  const res = await pool.query(`SELECT id, name, organization_id, is_active FROM sales_channels`);
  console.log('Channels:', res.rows);
  pool.end();
}
run();
