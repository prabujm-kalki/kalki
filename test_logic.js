const { Pool } = require('pg');
require('dotenv').config({path: '.env'});
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function test() {
  try {
    const rawPunches = await pool.query(`SELECT punch_timestamp FROM raw_biometric_punches WHERE employee_id = '6ca1172f-3f8f-4899-89c5-566b4646ed38' AND punch_timestamp >= '2026-09-20T00:00:00.000Z' AND punch_timestamp <= '2026-09-25T23:59:59.999Z'`);
    const punchesByDate = new Map();
    for (const p of rawPunches.rows) {
      const d = new Date(p.punch_timestamp);
      const dateKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      punchesByDate.set(dateKey, (punchesByDate.get(dateKey) || 0) + 1);
    }
    
    let anomalies = [];
    for (const [dateStr, count] of punchesByDate.entries()) {
      if (count % 2 !== 0) anomalies.push(dateStr);
    }
    console.log('Anomalies:', anomalies);
    
    let totalPresent = punchesByDate.size;
    let minHours = 0; // Number(shift.minHoursFullDay)
    if (!minHours || minHours === 0) minHours = 8;
    let totalNetHours = totalPresent * minHours;
    console.log('totalNetHours:', totalNetHours);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
test();
