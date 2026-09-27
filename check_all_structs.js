const { Pool } = require('pg');
require('dotenv').config({path: '.env'});
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function test() {
  const res = await pool.query(`SELECT id, is_active, effective_from FROM employee_salary_structures WHERE employee_id = '6ca1172f-3f8f-4899-89c5-566b4646ed38' ORDER BY effective_from DESC`);
  console.log(res.rows);
  pool.end();
}
test();
