const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos' });

async function inspectDeep() {
  const orgId = 'b5334ab2-b652-432b-8c16-774c90406261';

  // 1. Check Top Vendors by total spend
  const topVendors = await pool.query(`
    SELECT v.id, v.name, count(po.id) as po_count, COALESCE(SUM(po.total_amount::numeric), 0) as total_spent
    FROM vendors v
    LEFT JOIN purchase_orders po ON po.vendor_id = v.id AND po.organization_id = v.organization_id
    WHERE v.organization_id = $1
    GROUP BY v.id, v.name
    ORDER BY total_spent DESC
    LIMIT 10
  `, [orgId]);
  console.log('Top Vendors from DB:', topVendors.rows);

  // 2. Check Top Items by spend via purchase_order_lines
  const topItems = await pool.query(`
    SELECT pol.item_id, i.name_en, count(pol.id) as times_ordered,
           SUM(pol.ordered_quantity::numeric) as total_qty,
           SUM((pol.ordered_quantity::numeric) * (pol.unit_rate::numeric)) as total_value
    FROM purchase_order_lines pol
    JOIN purchase_orders po ON pol.po_id = po.id
    LEFT JOIN items i ON pol.item_id = i.id
    WHERE po.organization_id = $1
    GROUP BY pol.item_id, i.name_en
    ORDER BY total_value DESC
    LIMIT 10
  `, [orgId]);
  console.log('Top Items from PO Lines:', topItems.rows);

  // 3. Check Monthly Spend Trend from DB
  const monthlySpend = await pool.query(`
    SELECT TO_CHAR(created_at, 'Mon YY') as month_label,
           DATE_TRUNC('month', created_at) as month_date,
           COALESCE(SUM(total_amount::numeric), 0) as total_spend,
           COUNT(id) as po_count
    FROM purchase_orders
    WHERE organization_id = $1
    GROUP BY DATE_TRUNC('month', created_at), TO_CHAR(created_at, 'Mon YY')
    ORDER BY month_date ASC
  `, [orgId]);
  console.log('Monthly Spend Trend:', monthlySpend.rows);

  // 4. Check Category Spend Breakdown
  const categorySpend = await pool.query(`
    SELECT COALESCE(c.name, 'Uncategorized') as category_name,
           SUM((pol.ordered_quantity::numeric) * (pol.unit_rate::numeric)) as total_val
    FROM purchase_order_lines pol
    JOIN purchase_orders po ON pol.po_id = po.id
    LEFT JOIN items i ON pol.item_id = i.id
    LEFT JOIN item_categories c ON i.category_id = c.id
    WHERE po.organization_id = $1
    GROUP BY c.name
    ORDER BY total_val DESC
  `, [orgId]);
  console.log('Category Spend from Lines:', categorySpend.rows);

  // 5. Check Low Stock Items
  const lowStock = await pool.query(`
    SELECT i.id, i.name_en, i.base_min_stock, i.unit,
           COALESCE((
             SELECT balance_after::numeric 
             FROM inventory_ledger il 
             JOIN vendor_items vi ON il.vendor_item_id = vi.id 
             WHERE vi.item_id = i.id 
             ORDER BY il.recorded_at DESC 
             LIMIT 1
           ), 0) as current_stock
    FROM items i
    WHERE i.organization_id = $1 AND i.is_active = true
    ORDER BY i.name_en ASC
    LIMIT 10
  `, [orgId]);
  console.log('Sample Low Stock Check:', lowStock.rows);

  // 6. Check Supplier Invoices (Pending Bills)
  const pendingInvoices = await pool.query(`
    SELECT count(*) as count, COALESCE(SUM(total_amount::numeric), 0) as total_pending
    FROM supplier_invoices
    WHERE organization_id = $1 AND status != 'PAID'
  `, [orgId]);
  console.log('Pending Bills from Invoices:', pendingInvoices.rows[0]);

  process.exit(0);
}

inspectDeep().catch(console.error);
