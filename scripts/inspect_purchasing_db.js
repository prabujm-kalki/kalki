const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos' });

async function check() {
  const orgId = 'b5334ab2-b652-432b-8c16-774c90406261';
  const locId = 'd7f7131b-58e1-4e28-b83f-95a9b2e111a3';
  
  const pos = await pool.query('SELECT count(*), sum(total_amount::numeric) FROM purchase_orders WHERE organization_id = $1', [orgId]);
  console.log('Purchase orders summary:', pos.rows[0]);
  
  const samplePos = await pool.query('SELECT id, po_number, status, total_amount, created_at FROM purchase_orders WHERE organization_id = $1 ORDER BY created_at DESC LIMIT 5', [orgId]);
  console.log('Sample POs:', samplePos.rows);
  
  const vendors = await pool.query('SELECT id, name, is_active FROM vendors WHERE organization_id = $1 LIMIT 5', [orgId]);
  console.log('Sample Vendors:', vendors.rows);
  
  const items = await pool.query('SELECT id, name_en, current_price, base_min_stock, category_id FROM items WHERE organization_id = $1 LIMIT 5', [orgId]);
  console.log('Sample Items:', items.rows);
  
  const categories = await pool.query('SELECT id, name FROM item_categories WHERE organization_id = $1', [orgId]);
  console.log('Categories:', categories.rows);
  
  const invoices = await pool.query('SELECT count(*), sum(total_amount::numeric) FROM supplier_invoices WHERE organization_id = $1', [orgId]);
  console.log('Supplier Invoices:', invoices.rows[0]);

  const poStatusBreakdown = await pool.query('SELECT status, count(*), sum(total_amount::numeric) FROM purchase_orders WHERE organization_id = $1 GROUP BY status', [orgId]);
  console.log('PO Status Breakdown:', poStatusBreakdown.rows);

  process.exit(0);
}

check().catch(console.error);
