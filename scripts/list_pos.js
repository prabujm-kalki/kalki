const { Client } = require('pg');

async function listAllPOs() {
  const client = new Client({
    connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos'
  });
  await client.connect();
  const res = await client.query(`
    SELECT po.id, po.po_number, po.status, po.process_owner_role_id, po.review_role_id, u.name as creator_name
    FROM purchase_orders po
    LEFT JOIN "user" u ON po.created_by_user_id = u.id
    ORDER BY po.created_at DESC
  `);
  console.log("ALL POS:", res.rows);
  await client.end();
}
listAllPOs();
