const { Pool } = require('pg');
require('dotenv').config({path: '.env'});
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function inject() {
  try {
    const empRes = await pool.query(`SELECT organization_id, location_id FROM employees WHERE id = '6ca1172f-3f8f-4899-89c5-566b4646ed38'`);
    const emp = empRes.rows[0];
    
    // Check if a summary already exists for 25th
    const existing = await pool.query(`SELECT id FROM attendance_summaries WHERE employee_id = '6ca1172f-3f8f-4899-89c5-566b4646ed38' AND attendance_date = '2026-09-25'`);
    
    if (existing.rows.length === 0) {
      await pool.query(`
        INSERT INTO attendance_summaries (organization_id, location_id, employee_id, attendance_date, status, shift_definition_id, gross_hours, net_hours)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        emp.organization_id,
        emp.location_id,
        '6ca1172f-3f8f-4899-89c5-566b4646ed38',
        '2026-09-25',
        'PRESENT',
        'f6190b3f-9548-4d49-81cc-4059a857f4e9', // Hourly Shift
        '3.50',
        '3.50'
      ]);
      console.log('Successfully injected attendance summary for 2026-09-25 with 3.5 hours!');
    } else {
      await pool.query(`UPDATE attendance_summaries SET net_hours = '3.50', status = 'PRESENT' WHERE id = $1`, [existing.rows[0].id]);
      console.log('Successfully updated existing attendance summary for 2026-09-25 to 3.5 hours!');
    }
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
inject();
