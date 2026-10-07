const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

async function checkOrders() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    const result = await pool.query(`
      SELECT tmbill_order_display_id, order_date_time, order_subtotal, order_total
      FROM tmbill_orders
      ORDER BY order_date_time DESC
      LIMIT 15;
    `);
    console.table(result.rows);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    process.exit(0);
  }
}
checkOrders();
