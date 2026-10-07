const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

async function checkAll() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const result = await pool.query(`
      SELECT source_bill_id, bill_timestamp, net_amount 
      FROM sales_transactions
      WHERE source_system = 'TMBILL_API'
      AND bill_timestamp >= '2026-10-06 18:30:00+00'
      ORDER BY bill_timestamp DESC;
    `);
    console.table(result.rows);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    process.exit(0);
  }
}
checkAll();
