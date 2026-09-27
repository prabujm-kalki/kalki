const { Pool } = require('pg');
require('dotenv').config({path: '.env'});
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function check() {
  const punches = await pool.query(`SELECT punch_timestamp FROM raw_biometric_punches WHERE employee_id = '6ca1172f-3f8f-4899-89c5-566b4646ed38' AND punch_timestamp >= '2026-09-21' AND punch_timestamp <= '2026-09-25'`);
  console.log('Punches:', punches.rows);
  pool.end();
}
check();
