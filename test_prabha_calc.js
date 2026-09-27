const { Pool } = require('pg');
require('dotenv').config({path: '.env'});
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function test() {
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
  
  console.log('Comps:', compsRes.rows);

  let proRatedGross = 0;
  let totalNetHours = 16; // Suppose 16 hours
  for (const comp of compsRes.rows) {
      const amt = Number(comp.amount) || 0;
      if (comp.type === "EARNING") {
         if (comp.name.toLowerCase().includes("basic") || comp.name.toLowerCase().includes("hourly")) {
            proRatedGross += amt * totalNetHours;
         }
      }
  }
  console.log('Expected Gross:', proRatedGross);
  pool.end();
}
test();
