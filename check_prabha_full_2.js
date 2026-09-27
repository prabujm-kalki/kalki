const { Pool } = require('pg');
require('dotenv').config({path: '.env'});
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function analyze() {
  const res = await pool.query(`SELECT id, employee_code, status FROM employees WHERE employee_code = 'KAL-EMP-0006' AND status = 'ACTIVE'`);
  console.log('Employees:', res.rows);
  
  if (res.rows.length > 0) {
     const empId = res.rows[0].id;
     const structs = await pool.query(`SELECT * FROM employee_salary_structures WHERE employee_id = $1 AND is_active = true`, [empId]);
     console.log('Structs:', structs.rows);
     
     if (structs.rows.length > 0) {
        const comps = await pool.query(`SELECT c.name, esc.amount FROM employee_salary_structure_components esc JOIN salary_components c ON esc.component_id = c.id WHERE esc.structure_id = $1`, [structs.rows[0].id]);
        console.log('Comps:', comps.rows);
     }
  }
  pool.end();
}
analyze();
