const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  const res = await pool.query(`
    SELECT tmbill_order_id, order_total, raw_data
    FROM tmbill_orders 
    ORDER BY created_at DESC
    LIMIT 10
  `);
  
  console.log(`Found ${res.rows.length} records.`);
  
  for(let row of res.rows) {
    let p = row.raw_data;
    if (typeof p === 'string') {
      try { p = JSON.parse(p); } catch(e) {}
    }
    
    if (p) {
      console.log('ID:', row.tmbill_order_id, '| Total:', row.order_total);
      console.log('  RAW full details:', JSON.stringify({ 
        category: p.category, 
        orderType: p.orderType, 
        orderTypeName: p.orderTypeName,
        orderCategory: p.orderCategory,
        subOrderType: p.subOrderType,
        deliveryType: p.deliveryType,
        source: p.source,
      }));
      console.log('---');
    }
  }
  pool.end();
}
check();
