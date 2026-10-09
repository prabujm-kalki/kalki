const { Client } = require('pg');

async function run() {
  const c = new Client({ connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos' });
  await c.connect();
  
  const fromLocation = '467e6ec4-e7c0-4b24-8aeb-4e641f849da2'; // Avalpoondurai Department Store
  const toLocation = 'd7f7131b-58e4-4e28-b83f-95a9b2e111a3'; // Anakalpalayam Pilot
  
  // Dry Run: Check how many records will be updated
  const tmbillRes = await c.query(`SELECT COUNT(*) FROM tmbill_orders WHERE location_id = $1`, [fromLocation]);
  const invoiceRes = await c.query(`SELECT COUNT(*) FROM b2b_sales_invoices WHERE location_id = $1 AND tmbill_raw_data IS NOT NULL`, [fromLocation]);
  
  console.log(`Dry Run Results:`);
  console.log(`tmbill_orders to update: ${tmbillRes.rows[0].count}`);
  console.log(`b2b_sales_invoices to update: ${invoiceRes.rows[0].count}`);
  
  // Perform update
  console.log('Updating...');
  await c.query(`UPDATE tmbill_orders SET location_id = $1 WHERE location_id = $2`, [toLocation, fromLocation]);
  await c.query(`UPDATE b2b_sales_invoices SET location_id = $1 WHERE location_id = $2 AND tmbill_raw_data IS NOT NULL`, [toLocation, fromLocation]);
  
  console.log('Update complete.');
  
  await c.end();
}
run();
