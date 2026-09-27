const { Pool } = require('pg');
require('dotenv').config({path: '.env'});
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function revert() {
  await pool.query(`DELETE FROM employee_salary_structure_components WHERE amount = 500`);
  console.log('Dummy component removed.');
  
  const res = await pool.query(`SELECT e.employee_code, p.first_name FROM people p JOIN employees e ON p.id = e.person_id WHERE p.first_name ILIKE '%prabha%'`);
  if (res.rows.length > 0) {
     const empCode = res.rows[0].employee_code;
     const structs = await pool.query(`SELECT ess.* FROM employee_salary_structures ess JOIN employees e ON ess.employee_id = e.id WHERE e.employee_code = $1 AND ess.is_active = true ORDER BY ess.effective_from DESC LIMIT 1`, [empCode]);
     
     if (structs.rows.length > 0) {
        const comps = await pool.query(`SELECT c.name, esc.amount FROM employee_salary_structure_components esc JOIN salary_components c ON esc.component_id = c.id WHERE esc.structure_id = $1`, [structs.rows[0].id]);
        console.log('Actual Comps for Prabha:', comps.rows);
     }
  }
  pool.end();
}
revert();
