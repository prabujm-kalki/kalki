const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  console.log('Starting retroactive channel sync...');
  
  // Get all mappings
  const resMappings = await pool.query(`SELECT external_string, internal_channel_id FROM pos_channel_mappings WHERE provider_name = 'TMBILL'`);
  const mappings = resMappings.rows;
  console.log(`Found ${mappings.length} mappings`);

  let updated = 0;
  for (const m of mappings) {
    const extStr = m.external_string;
    const channelId = m.internal_channel_id;

    // Update sales_invoices where tmbill_raw_data->>'table_name' == extStr
    const updateRes = await pool.query(`
      UPDATE b2b_sales_invoices
      SET channel_id = $1
      WHERE tmbill_raw_data->>'table_name' = $2
    `, [channelId, extStr]);

    if (updateRes.rowCount > 0) {
      console.log(`Updated ${updateRes.rowCount} invoices for external string: ${extStr}`);
      updated += updateRes.rowCount;
    }
  }

  console.log(`Finished retroactive sync. Total invoices updated: ${updated}`);
  await pool.end();
}

run().catch(console.error);
