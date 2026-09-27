const { Pool } = require('pg');
require('dotenv').config({path: '.env'});
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function check() {
  const structs = await pool.query(`SELECT id FROM employee_salary_structures WHERE employee_id = '6ca1172f-3f8f-4899-89c5-566b4646ed38' AND is_active = true`);
  const activeId = structs.rows[0].id;
  const comps = await pool.query(`SELECT c.name, esc.amount FROM employee_salary_structure_components esc JOIN salary_components c ON esc.component_id = c.id WHERE esc.structure_id = $1`, [activeId]);
  console.log('Comps:', comps.rows);
  pool.end();
}
check();
