const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/kalki',
});

async function main() {
  const roleId = 'b975a9aa-3b19-4e29-a93d-16b03fbf5e77';
  
  const before = await pool.query('SELECT id, name, code FROM roles WHERE id = $1', [roleId]);
  console.log('Before update in roles:', before.rows);
  
  const bRole = await pool.query('SELECT id, name, identifier FROM business_roles WHERE id = $1', [roleId]);
  console.log('Corresponding business_role:', bRole.rows);

  const updateRes = await pool.query(
    'UPDATE roles SET name = $1, code = $2 WHERE id = $3 RETURNING id, name, code',
    ['Head Chef', 'head_chef', roleId]
  );
  console.log('After update in roles:', updateRes.rows);

  await pool.end();
}

main().catch(console.error);
