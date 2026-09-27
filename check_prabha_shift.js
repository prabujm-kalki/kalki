const { Pool } = require('pg');
require('dotenv').config({path: '.env'});
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function test() {
  const res = await pool.query(`SELECT default_shift_id FROM employees WHERE employee_code = 'KAL-EMP-0006'`);
  const shiftId = res.rows[0].default_shift_id;
  console.log('Shift ID:', shiftId);
  if (shiftId) {
     const shiftRes = await pool.query(`SELECT * FROM shift_definitions WHERE id = $1`, [shiftId]);
     console.log('Shift:', shiftRes.rows[0]);
  }
  pool.end();
}
test();
