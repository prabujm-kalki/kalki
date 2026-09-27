const { Pool } = require('pg');
require('dotenv').config({path: '.env'});
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query(`
  SELECT c.id as comp_id, c.name, esc.amount 
  FROM employees e
  JOIN employee_salary_structures ess ON e.id = ess.employee_id
  JOIN employee_salary_structure_components esc ON ess.id = esc.structure_id
  JOIN salary_components c ON esc.component_id = c.id
  WHERE e.employee_code = 'KAL-EMP-0006' AND ess.is_active = true
`).then(res => { console.log(res.rows); process.exit(); });
