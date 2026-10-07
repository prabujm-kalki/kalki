const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

async function checkDuplicates() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    const result = await pool.query(`
      SELECT 
        source_bill_id, 
        COUNT(*) as times_imported,
        SUM(net_amount::numeric) as sum_amount
      FROM sales_transactions
      WHERE source_system = 'TMBILL_API'
      GROUP BY source_bill_id
      HAVING COUNT(*) > 1;
    `);
    console.table(result.rows);
    
    const today = await pool.query(`
      SELECT 
        COUNT(id) as bills,
        SUM(net_amount::numeric) as total_amount
      FROM sales_transactions
      WHERE source_system = 'TMBILL_API'
      AND bill_timestamp >= '2026-10-06 18:30:00+00';
    `);
    console.log("Today's stats:", today.rows[0]);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    process.exit(0);
  }
}
checkDuplicates();
