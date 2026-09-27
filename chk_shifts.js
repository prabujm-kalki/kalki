const { Pool } = require('pg');
require('dotenv').config({path: '.env'});
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function check() {
  const empRes = await pool.query(`SELECT default_shift_id FROM employees WHERE employee_code = 'KAL-EMP-0006'`);
  console.log('Emp shift:', empRes.rows[0]);
  
  const shifts = await pool.query(`SELECT id, name FROM shift_definitions`);
  console.log('All shifts:', shifts.rows);
  pool.end();
}
check();
