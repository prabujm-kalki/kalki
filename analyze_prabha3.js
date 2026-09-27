const { Pool } = require('pg');
require('dotenv').config({path: '.env'});
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function analyze() {
  const empRes = await pool.query(`SELECT e.* FROM employees e JOIN people p ON e.person_id = p.id WHERE p.display_name ILIKE '%Prabha%'`);
  const emp = empRes.rows[0];
  console.log('Employee:', emp.id);

  const structRes = await pool.query(`SELECT * FROM employee_salary_structures WHERE employee_id = $1 ORDER BY effective_from DESC LIMIT 1`, [emp.id]);
  const struct = structRes.rows[0];
  console.log('Structure:', struct.id);

  const compsRes = await pool.query(`
    SELECT c.name, c.type, esc.amount
    FROM employee_salary_structure_components esc
    JOIN salary_components c ON esc.component_id = c.id
    WHERE esc.structure_id = $1
  `, [struct.id]);
  
  console.log('Raw Components:', compsRes.rows);

  const uniqueComps = Array.from(new Map(compsRes.rows.map(c => [c.name, c])).values());
  console.log('Unique Components:', uniqueComps);

  let grossAmount = 0;
  for (const c of uniqueComps) {
    if (c.type === 'EARNING') grossAmount += Number(c.amount);
  }
  console.log('Gross Amount Base:', grossAmount);

  // Attendance
  const startD = new Date('2026-09-20');
  const endD = new Date('2026-09-25');
  const attRes = await pool.query(`
    SELECT net_hours FROM attendance_summaries 
    WHERE employee_id = $1 AND attendance_date >= $2 AND attendance_date <= $3
  `, [emp.id, startD, endD]);
  
  console.log('Attendance summaries:', attRes.rows);

  let totalNetHours = 0;
  for(const r of attRes.rows) {
     totalNetHours += Number(r.net_hours) || 0;
  }
  
  console.log('Total Net Hours from summaries:', totalNetHours);
  if(attRes.rows.length === 0) {
     const rawPunches = await pool.query(`
        SELECT punch_timestamp FROM raw_biometric_punches 
        WHERE employee_id = $1 AND punch_timestamp >= $2 AND punch_timestamp <= $3
     `, [emp.id, startD, endD]);
     const uniqueDates = new Set(rawPunches.rows.map(p => {
        const d = new Date(p.punch_timestamp);
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
     }));
     const totalPresent = uniqueDates.size;
     totalNetHours = totalPresent * 8;
     console.log('No summaries. Computed from raw punches. Present:', totalPresent, 'NetHours:', totalNetHours);
  }

  const proRatedGross = grossAmount * totalNetHours;
  console.log('Calculated ProRatedGross:', proRatedGross);
  
  process.exit();
}
analyze().catch(console.error);
