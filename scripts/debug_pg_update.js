const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos' });

async function run() {
  try {
    const q = 'update "organizations" set "whatsapp_po_template" = $1, "enable_mobile_push_notifications" = $2, "notification_tone" = $3, "custom_tones" = $4, "whatsapp_config" = $5 where "organizations"."id" = $6';
    const params = ['Hello', false, 'level-1', {}, JSON.stringify({phoneNumberId:'1415381141650668'}), 'b5334ab2-b652-432b-8c16-774c90406261'];
    await pool.query(q, params);
    console.log('PG UPDATE SUCCESSFUL!');
  } catch (err) {
    console.error('EXACT PG ERROR:', err);
  } finally {
    await pool.end();
  }
}

run();
