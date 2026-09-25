const { Pool } = require('pg');
require('dotenv').config();

async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const result = await pool.query("SELECT * FROM account WHERE provider_id = 'credential' LIMIT 1");
  console.log(result.rows);
  process.exit(0);
}
run();
