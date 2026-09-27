const { Pool } = require('pg');
require('dotenv').config({path: '.env'});
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function analyze() {
  const res = await pool.query(`
    SELECT attendance_date, status, net_hours 
    FROM attendance_summaries 
    WHERE employee_id = '6ca1172f-3f8f-4899-89c5-566b4646ed38'
  `);
  console.log('Summaries:', res.rows);
  pool.end();
}
analyze();
