const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

async function unsync() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    await pool.query('UPDATE tmbill_orders SET is_synced_to_finance = false');
    console.log("Unsynced all orders.");
  } catch (error) {
    console.error("Error applying SQL:", error);
  } finally {
    process.exit(0);
  }
}
unsync();
