const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  const ids = [
    'TM-1g4amtJmF3BcZxX42mz74382',
    'TM-1g4amkppDVTRtBLuar7H2655',
    'TM-1g4amiDLpk1X4JjlelR13374',
    'TM-1g4amiDLpk1X4JjIeIr13374', // possible typo variant
    'TM-1g4am8euVAXtIbfvBfC74250',
    'TM-1g4am8euVAXtlbfvBfC74250'  // possible typo variant
  ];
  
  const res = await pool.query(`
    SELECT tmbill_order_id, raw_data
    FROM tmbill_orders 
    WHERE tmbill_order_id = ANY($1)
  `, [ids]);
  
  console.log(`Found ${res.rows.length} records.`);
  
  for(let row of res.rows) {
    let p = row.raw_data;
    if (typeof p === 'string') {
      try { p = JSON.parse(p); } catch(e) {}
    }
    
    if (p) {
      console.log('ID:', row.tmbill_order_id);
      console.log('  RAW category:', p.category);
      console.log('  RAW orderType:', p.orderType);
      console.log('  RAW orderTypeName:', p.orderTypeName);
      console.log('  RAW subOrderType:', p.subOrderType);
      console.log('  RAW subOrderTypeName:', p.subOrderTypeName);
      console.log('  RAW full details:', JSON.stringify({ 
        category: p.category, 
        orderType: p.orderType, 
        orderTypeName: p.orderTypeName,
        orderCategory: p.orderCategory,
        subOrderType: p.subOrderType,
        deliveryType: p.deliveryType,
        source: p.source,
      }, null, 2));
      console.log('---');
    }
  }
  pool.end();
}
check();
