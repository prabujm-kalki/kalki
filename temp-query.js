const { Client } = require('pg');
require('dotenv').config();
const client = new Client({ connectionString: process.env.DATABASE_URL });
async function run() {
  await client.connect();
  const res = await client.query(`UPDATE attendance_summaries SET last_punch_out = '2026-09-26T16:28:23.230Z', is_regularized = true, status = 'PRESENT', net_hours = '8.00' FROM employees e WHERE attendance_summaries.employee_id = e.id AND e.employee_code = 'KAL-EMP-0006' AND attendance_summaries.attendance_date = '2026-09-25'`);
  console.log('--- DB UPDATED ---', res.rowCount);
  await client.end();
}
run();
