const { Pool } = require('pg');
require('dotenv').config({path: '.env'});
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query(`
  DELETE FROM employee_salary_structure_components
  WHERE component_id = '603f1b12-8d7f-497e-b686-0f27c971f821'
`).then(res => { console.log('Deleted!'); process.exit(); });
