const { Pool } = require('pg');
require('dotenv').config({path: '.env'});
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function test() {
  try {
    const rawPunches = await pool.query(`SELECT employee_id, punch_timestamp FROM raw_biometric_punches WHERE punch_timestamp >= '2026-09-20T00:00:00.000Z' AND punch_timestamp <= '2026-09-25T23:59:59.999Z'`);
    const punchesByDateAndEmp = new Map();
    for (const p of rawPunches.rows) {
      const d = new Date(p.punch_timestamp);
      const dateKey = `${p.employee_id}_${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      punchesByDateAndEmp.set(dateKey, (punchesByDateAndEmp.get(dateKey) || 0) + 1);
    }
    
    let anomalies = [];
    for (const [key, count] of punchesByDateAndEmp.entries()) {
      if (count % 2 !== 0) anomalies.push(key);
    }
    console.log('Anomalies:', anomalies);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
test();
