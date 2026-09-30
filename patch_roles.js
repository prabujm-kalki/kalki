require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    // Start mapping
    
    const res = await pool.query("SELECT * FROM permissions");
    console.log(res.rows);

    // Done

  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
run();
