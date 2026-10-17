const { Client } = require('pg');

async function findRavi() {
  const client = new Client({
    connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos'
  });
  await client.connect();
  const res = await client.query(`
    SELECT po.id, po.po_number, po.status, po.process_owner_role_id, po.review_role_id, po.created_by_user_id, u.name as creator_name
    FROM purchase_orders po
    JOIN "user" u ON po.created_by_user_id = u.id
    WHERE u.name ILIKE '%Ravi%'
  `);
  console.log("RAVI POS:", res.rows);
  const roles = await client.query(`
    SELECT id, name, reports_to_role_id FROM business_roles
  `);
  console.log("ROLES LIST:", roles.rows);
  await client.end();
}
findRavi();
