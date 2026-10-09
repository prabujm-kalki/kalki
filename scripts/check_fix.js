const { Client } = require('pg');

async function checkFix() {
  const client = new Client({
    connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos'
  });
  await client.connect();
  
  const orgId = "b5334ab2-b652-432b-8c16-774c90406261";
  
  const tmRes = await client.query(`
    SELECT tmbill_order_id, is_synced_to_finance, order_date_time 
    FROM tmbill_orders 
    WHERE organization_id = $1 
      AND order_date_time >= '2026-10-06 00:00:00' 
      AND order_date_time <= '2026-10-06 23:59:59'
    LIMIT 10
  `, [orgId]);
  
  console.log("Oct 6th tmbill_orders status:", tmRes.rows);

  await client.end();
}
checkFix();
