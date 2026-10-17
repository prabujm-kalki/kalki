const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos' });

async function testSubquery() {
  const orgId = 'b5334ab2-b652-432b-8c16-774c90406261';
  const locId = 'd7f7131b-58e4-4e28-b83f-95a9b2e111a3';
  
  // Test query 1: with "id"
  try {
    await pool.query(`
      select "id", "name_en", "unit", "base_min_stock", COALESCE(( SELECT balance_after::numeric FROM inventory_ledger il JOIN vendor_items vi ON il.vendor_item_id = vi.id WHERE vi.item_id = "id" ORDER BY il.recorded_at DESC LIMIT 1 ), 0) from "items" where ("items"."organization_id" = $1 and "items"."is_active" = $2 and "items"."location_id" = $3) order by "items"."base_min_stock" desc limit 5
    `, [orgId, true, locId]);
  } catch (err) {
    console.log("Error with WHERE vi.item_id = \"id\":", err.message);
  }

  // Test query 2: with "items"."id"
  try {
    const res2 = await pool.query(`
      select "id", "name_en", "unit", "base_min_stock", COALESCE(( SELECT balance_after::numeric FROM inventory_ledger il JOIN vendor_items vi ON il.vendor_item_id = vi.id WHERE vi.item_id = "items"."id" ORDER BY il.recorded_at DESC LIMIT 1 ), 0) from "items" where ("items"."organization_id" = $1 and "items"."is_active" = $2 and "items"."location_id" = $3) order by "items"."base_min_stock" desc limit 5
    `, [orgId, true, locId]);
    console.log("Success with WHERE vi.item_id = \"items\".\"id\":", res2.rows.length, "rows");
  } catch (err) {
    console.log("Error with \"items\".\"id\":", err.message);
  }

  process.exit(0);
}
testSubquery().catch(console.error);
