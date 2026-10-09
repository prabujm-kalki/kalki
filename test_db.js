const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos' });
async function check() {
  const res = await pool.query("SELECT * FROM \"user\" WHERE email LIKE '%9790014356%' OR name LIKE '%9790014356%'");
  console.log(res.rows);
  pool.end();
}
check().catch(console.error);
