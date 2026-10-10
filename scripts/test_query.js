const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const res = await pool.query(`
    SELECT i.id, c.name as channel_name 
    FROM b2b_sales_invoices i
    LEFT JOIN sales_channels c ON i.channel_id = c.id
    LIMIT 5
  `);
  console.log(res.rows);
  await pool.end();
}
run().catch(console.error);
