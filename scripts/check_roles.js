const { Client } = require('pg');

async function checkDetails() {
  const client = new Client({
    connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos'
  });
  await client.connect();
  const roles = await client.query('SELECT id, name, reports_to_role_id FROM business_roles');
  console.log('ROLES:', roles.rows);
  const users = await client.query('SELECT id, name, email FROM "user"');
  console.log('USERS:', users.rows);
  const lra = await client.query('SELECT lra.*, u.name, br.name as role_name FROM location_role_assignments lra JOIN "user" u ON lra.user_id = u.id JOIN business_roles br ON lra.role_id = br.id');
  console.log('LOCATION ROLE ASSIGNMENTS:', lra.rows);
  const ora = await client.query('SELECT ora.*, u.name, br.name as role_name FROM organization_role_assignments ora JOIN "user" u ON ora.user_id = u.id JOIN business_roles br ON ora.role_id = br.id');
  console.log('ORG ROLE ASSIGNMENTS:', ora.rows);
  await client.end();
}
checkDetails();
