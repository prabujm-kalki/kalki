const { Pool } = require('pg');
require('dotenv').config({path: '.env'});
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query(`SELECT * FROM attendance_summaries WHERE employee_id = '6ca1172f-3f8f-4899-89c5-566b4646ed38'`).then(res => { console.log(res.rows); pool.end(); });
