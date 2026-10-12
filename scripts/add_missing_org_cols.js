const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos' });

async function fix() {
  await pool.query("ALTER TABLE organizations ADD COLUMN IF NOT EXISTS enable_mobile_push_notifications boolean DEFAULT false NOT NULL");
  await pool.query("ALTER TABLE organizations ADD COLUMN IF NOT EXISTS notification_tone text DEFAULT 'level-1' NOT NULL");
  console.log("Successfully added missing mobile notification columns to organizations table!");
  await pool.end();
}

fix().catch(console.error);
