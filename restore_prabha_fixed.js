const { Pool } = require('pg');
require('dotenv').config({path: '.env'});
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function analyze() {
  const res = await pool.query(`SELECT e.employee_code, p.first_name FROM people p JOIN employees e ON p.id = e.person_id WHERE p.first_name ILIKE '%prabha%'`);
  if (res.rows.length > 0) {
     const empCode = res.rows[0].employee_code;
     const structs = await pool.query(`SELECT ess.* FROM employee_salary_structures ess JOIN employees e ON ess.employee_id = e.id WHERE e.employee_code = $1 AND ess.is_active = true ORDER BY ess.effective_from DESC LIMIT 1`, [empCode]);
     if (structs.rows.length > 0) {
        const structId = structs.rows[0].id;
        const basicId = '3d5a22f8-0ea2-41f1-87c4-5d3e7cda3169';
        await pool.query(`INSERT INTO employee_salary_structure_components (id, structure_id, component_id, amount) VALUES (gen_random_uuid(), $1, $2, $3)`, [structId, basicId, 500.00]);
        console.log('Restored Basic Pay for Prabha!');
     }
  }
  pool.end();
}
analyze();
