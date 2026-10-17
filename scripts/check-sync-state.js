const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const ordersRes = await client.query(`
    SELECT 
      MIN(order_date_time) as min_dt, 
      MAX(order_date_time) as max_dt, 
      COUNT(*) as total_orders 
    FROM tmbill_orders 
    WHERE location_id = '0aaf0100-391c-4517-adfb-6e162134287b'
  `);
  console.log('Orders Summary:', ordersRes.rows[0]);

  const invoicesRes = await client.query(`
    SELECT 
      MIN(invoice_date) as min_dt, 
      MAX(invoice_date) as max_dt, 
      COUNT(*) as total_invoices 
    FROM b2b_sales_invoices 
    WHERE location_id = '0aaf0100-391c-4517-adfb-6e162134287b'
  `);
  console.log('Invoices Summary:', invoicesRes.rows[0]);

  const unsyncedRes = await client.query(`
    SELECT COUNT(*) as unsynced_orders
    FROM tmbill_orders
    WHERE location_id = '0aaf0100-391c-4517-adfb-6e162134287b'
      AND is_synced_to_finance = false
  `);
  console.log('Unsynced Orders:', unsyncedRes.rows[0]);

  const logsRes = await client.query(`
    SELECT id, status, sync_type, metadata, started_at, completed_at, records_processed, records_failed
    FROM tmbill_sync_logs
    ORDER BY started_at DESC
    LIMIT 6
  `);
  console.log('Recent Sync Logs:');
  console.log(JSON.stringify(logsRes.rows, null, 2));

  await client.end();
}

main().catch(console.error);
