const { Pool } = require('pg');
require('dotenv').config({path: '.env'});
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function analyze() {
  const empRes = await pool.query(`SELECT * FROM employees WHERE employee_code = 'KAL-EMP-0006'`);
  const emp = empRes.rows[0];
  const structRes = await pool.query(`SELECT * FROM employee_salary_structures WHERE employee_id = $1`, [emp.id]);
  console.log('Structures:', structRes.rows);
  pool.end();
}
analyze();
