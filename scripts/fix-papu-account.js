const { Pool } = require('pg');
require('dotenv').config();

async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const result = await pool.query("UPDATE account SET account_id = user_id WHERE provider_id = 'credential' AND account_id != user_id");
  console.log(`Updated ${result.rowCount} records`);
  process.exit(0);
}
run();
