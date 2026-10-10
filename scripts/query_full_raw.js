const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  const ids = [
    '1g4amtJmF3BcZxX42mz74382',
    '1g4amkppDVTRtBLuar7H2655',
    '1g4amiDLpk1X4JjlelR13374',
    '1g4amiDLpk1X4JjIeIr13374', 
    '1g4am8euVAXtIbfvBfC74250',
    '1g4am8euVAXtlbfvBfC74250'
  ];
  
  const res = await pool.query(`
    SELECT tmbill_order_id, order_total, raw_data
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
      console.log('ID:', row.tmbill_order_id, '| Total:', row.order_total);
      console.log(JSON.stringify(p, null, 2));
      console.log('---');
    }
  }
  pool.end();
}
check();
