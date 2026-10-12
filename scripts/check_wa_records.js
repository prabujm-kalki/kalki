const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos' });

async function check() {
  const res = await pool.query("SELECT meta_message_id, direction, status, sender_number, content, customer_id, created_at FROM whatsapp_communications ORDER BY created_at DESC LIMIT 5");
  console.log("INSERTED RECORDS:", res.rows);
  await pool.end();
}
check().catch(console.error);
