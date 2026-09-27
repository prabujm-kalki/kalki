const { Pool } = require('pg');
require('dotenv').config({path: '.env'});
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function check() {
  const shifts = await pool.query(`SELECT id, shift_name FROM shift_definitions`);
  console.log('All shifts:', shifts.rows);
  
  const empRes = await pool.query(`SELECT id, default_shift_id FROM employees WHERE employee_code = 'KAL-EMP-0006'`);
  console.log('Emp shift:', empRes.rows[0]);
  pool.end();
}
check();
