const { Pool } = require('pg');
require('dotenv').config({path: '.env'});
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function check() {
  const empRes = await pool.query(`SELECT id FROM employees WHERE employee_code = 'KAL-EMP-0006'`);
  const empId = empRes.rows[0].id;
  const structs = await pool.query(`SELECT id, is_active, pay_basis, effective_from FROM employee_salary_structures WHERE employee_id = $1 ORDER BY effective_from DESC`, [empId]);
  console.log('Structures:', structs.rows);
  
  for (const s of structs.rows) {
     const comps = await pool.query(`SELECT c.name, esc.amount FROM employee_salary_structure_components esc JOIN salary_components c ON esc.component_id = c.id WHERE esc.structure_id = $1`, [s.id]);
     console.log('Comps for', s.id, comps.rows);
  }
  pool.end();
}
check();
