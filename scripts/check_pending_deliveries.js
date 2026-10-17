const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos' });

async function checkPendingDeliveries() {
  const orgId = 'b5334ab2-b652-432b-8c16-774c90406261';
  const pos = await pool.query(`
    SELECT po.id, po.po_number, v.name as vendor_name, po.status, po.created_at, po.total_amount
    FROM purchase_orders po
    LEFT JOIN vendors v ON po.vendor_id = v.id
    WHERE po.organization_id = $1
      AND po.status IN ('in_transit', 'ordered', 'approved', 'pending_receipt', 'pending_approval', 'draft')
    ORDER BY po.created_at DESC
  `, [orgId]);
  console.log('Pending Deliveries Candidates in DB:', pos.rows);

  const goodsReceived = await pool.query(`
    SELECT count(*) as goods_received_count
    FROM purchase_orders
    WHERE organization_id = $1
      AND status IN ('completed', 'received', 'audited')
      AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
  `, [orgId]);
  console.log('Goods Received this month:', goodsReceived.rows[0]);

  process.exit(0);
}
checkPendingDeliveries().catch(console.error);
