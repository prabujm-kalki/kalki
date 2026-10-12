const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos' });

async function addCol() {
  await pool.query("ALTER TABLE organizations ADD COLUMN IF NOT EXISTS whatsapp_config jsonb DEFAULT '{}'::jsonb");
  console.log("Column whatsapp_config added successfully to organizations table!");
  await pool.end();
}
addCol().catch(console.error);
