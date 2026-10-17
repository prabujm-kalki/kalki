import { db } from '../src/db';
import { sql } from 'drizzle-orm';
import fs from 'fs';

async function main() {
  const migrationSql = fs.readFileSync('drizzle/0055_quick_purchase_micro_procurement.sql', 'utf8');
  await db.execute(sql.raw(migrationSql));
  console.log('Migration 0055 executed successfully!');

  // Verify tables and columns
  const tables = await db.execute(sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_name IN ('branch_purchase_policies', 'spot_purchases')
  `);
  console.log('Verified tables:', tables.rows);

  const cols = await db.execute(sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'items' AND column_name IN ('allow_spot_purchase', 'spot_purchase_price_limit', 'is_inventory_tracked')
  `);
  console.log('Verified items columns:', cols.rows);
  process.exit(0);
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
