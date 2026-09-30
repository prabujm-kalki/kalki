require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const res = await pool.query("SELECT rp.role_id, p.code, p.id as perm_id FROM role_permissions rp JOIN permissions p ON rp.permission_id = p.id WHERE p.code LIKE 'people.%' OR p.code LIKE 'employee.%'");
    console.log(res.rows);
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
run();
