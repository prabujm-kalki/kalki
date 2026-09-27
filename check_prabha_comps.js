const { Pool } = require('pg');
require('dotenv').config({path: '.env'});
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function analyze() {
  const empRes = await pool.query(`SELECT * FROM employees WHERE employee_code = 'KAL-EMP-0006'`);
  const emp = empRes.rows[0];
  const structRes = await pool.query(`SELECT * FROM employee_salary_structures WHERE employee_id = $1 AND is_active = true ORDER BY effective_from DESC LIMIT 1`, [emp.id]);
  const struct = structRes.rows[0];
  const compsRes = await pool.query(`
    SELECT c.name, c.type, esc.amount
    FROM employee_salary_structure_components esc
    JOIN salary_components c ON esc.component_id = c.id
    WHERE esc.structure_id = $1
  `, [struct.id]);
  console.log('Components:', compsRes.rows);
  pool.end();
}
analyze();
