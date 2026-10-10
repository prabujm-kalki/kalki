const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  const res = await pool.query(`
    SELECT tmbill_order_id, raw_payload
    FROM tmbill_orders 
    ORDER BY created_at DESC 
    LIMIT 20
  `);
  
  for(let row of res.rows) {
    const p = typeof row.raw_payload === 'string' ? JSON.parse(row.raw_payload) : row.raw_payload;
    if (p) {
      console.log('ID:', row.tmbill_order_id);
      console.log('  orderType:', p.orderType);
      console.log('  subOrderType:', p.subOrderType);
      console.log('  amount:', p.totalAmount || p.grandTotal);
      console.log('---');
    }
  }
  pool.end();
}
check();
