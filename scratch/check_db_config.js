const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

async function check() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const result = await pool.query(`SELECT * FROM tmbill_configs`);
    console.table(result.rows);
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}
check();
