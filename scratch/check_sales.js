const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

async function checkSales() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    const result = await pool.query(`
      SELECT 
        DATE(bill_timestamp) as date,
        COUNT(id) as bills,
        SUM(net_amount::numeric) as total_amount
      FROM sales_transactions
      WHERE source_system = 'TMBILL_API'
      GROUP BY DATE(bill_timestamp)
      ORDER BY date DESC;
    `);
    console.table(result.rows);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    process.exit(0);
  }
}
checkSales();
