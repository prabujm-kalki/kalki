const { Pool } = require('pg');
require('dotenv').config({path: '.env'});
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query(`SELECT location_id FROM employees WHERE employee_code = 'KAL-EMP-0006'`).then(res => { console.log(res.rows[0]); pool.end(); });
