import { Pool } from 'pg';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    const fs = await import('fs');
    const sql = fs.readFileSync('drizzle/0055_quick_purchase_micro_procurement.sql', 'utf8');
    await client.query(sql);
    console.log('MIGRATION_SUCCESS');

    const resTables = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name IN ('branch_purchase_policies', 'spot_purchases')
    `);
    console.log('TABLES:', resTables.rows.map(r => r.table_name));

    const resCols = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'items' AND column_name IN ('allow_spot_purchase', 'spot_purchase_price_limit', 'is_inventory_tracked')
    `);
    console.log('ITEMS_COLUMNS:', resCols.rows.map(r => r.column_name));
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
