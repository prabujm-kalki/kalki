require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  console.log('CONNECTED_TO_PG');

  const sql = fs.readFileSync('drizzle/0055_quick_purchase_micro_procurement.sql', 'utf8');
  await client.query(sql);
  console.log('MIGRATION_0055_SUCCESS');

  const resTables = await client.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_name IN ('branch_purchase_policies', 'spot_purchases')
  `);
  console.log('TABLES_IN_DB:', resTables.rows.map(r => r.table_name));

  const resCols = await client.query(`
    SELECT column_name, data_type FROM information_schema.columns 
    WHERE table_name = 'items' AND column_name IN ('allow_spot_purchase', 'spot_purchase_price_limit', 'is_inventory_tracked')
  `);
  console.log('ITEMS_COLS:', resCols.rows);

  await client.end();
  console.log('DONE');
}

main().catch(err => {
  console.error('ERROR:', err);
  process.exit(1);
});
