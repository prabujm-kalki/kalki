const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function alter() {
  try {
    await pool.query(`ALTER TABLE tmbill_configs ADD COLUMN provider_name VARCHAR(255) DEFAULT 'TMBILL'`);
    console.log('Added provider_name column.');
  } catch (e) {
    console.log('Column might already exist:', e.message);
  }
  pool.end();
}
alter();
