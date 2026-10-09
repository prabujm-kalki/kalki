const { Client } = require('pg');

async function fixUnsynced() {
  const client = new Client({
    connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos'
  });
  await client.connect();
  
  const orgId = "b5334ab2-b652-432b-8c16-774c90406261";
  
  console.log("Fixing tmbill_orders that are marked true but missing from finance...");
  
  // Find all tmbill_orders that are marked true
  const tmRes = await client.query(`
    SELECT tmbill_order_id, id 
    FROM tmbill_orders 
    WHERE organization_id = $1 AND is_synced_to_finance = true
  `, [orgId]);
  
  const tmbillOrders = tmRes.rows;
  console.log(`Found ${tmbillOrders.length} orders marked as synced.`);
  
  // Find all b2b_sales_invoices that have tmbill_raw_data
  const b2bRes = await client.query(`
    SELECT tmbill_raw_data->>'order_id' as tmbill_id
    FROM b2b_sales_invoices 
    WHERE organization_id = $1 AND tmbill_raw_data IS NOT NULL
  `, [orgId]);
  
  // We also need to check invoices that were inserted BEFORE tmbill_raw_data was added!
  // These invoices might have invoice_number = 'TM-<order_id>' or invoice_number = '<display_id>'
  const allB2b = await client.query(`
    SELECT invoice_number 
    FROM b2b_sales_invoices 
    WHERE organization_id = $1
  `, [orgId]);
  
  const b2bInvoiceNumbers = new Set(allB2b.rows.map(r => r.invoice_number));
  const b2bTmbillIds = new Set(b2bRes.rows.filter(r => r.tmbill_id).map(r => r.tmbill_id));
  
  let resetCount = 0;
  
  for (const order of tmbillOrders) {
    const isUnderRawData = b2bTmbillIds.has(order.tmbill_order_id);
    const isUnderTM = b2bInvoiceNumbers.has(`TM-${order.tmbill_order_id}`);
    const isUnderPlain = b2bInvoiceNumbers.has(order.tmbill_order_id);
    
    // We can't reliably check display ID, but if it doesn't match any of the above, it's likely missing
    if (!isUnderRawData && !isUnderTM && !isUnderPlain) {
      await client.query(`
        UPDATE tmbill_orders 
        SET is_synced_to_finance = false 
        WHERE id = $1
      `, [order.id]);
      resetCount++;
    }
  }
  
  console.log(`Reset ${resetCount} orders to is_synced_to_finance = false.`);

  await client.end();
}
fixUnsynced();
