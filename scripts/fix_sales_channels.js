const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function fixData() {
  await pool.query(`UPDATE sales_channels SET name = 'Catering' WHERE name = 'B2B Catering'`);
  await pool.query(`UPDATE sales_channels SET type = 'B2C'`);
  console.log('Fixed data');
  pool.end();
}
fixData();
