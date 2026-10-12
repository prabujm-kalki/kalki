const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos' });

async function run() {
  const orgRes = await pool.query("SELECT id, name, whatsapp_config FROM organizations WHERE id = 'b5334ab2-b652-432b-8c16-774c90406261'");
  const cfg = orgRes.rows[0].whatsapp_config;
  const token = cfg.apiToken;
  const phoneId = cfg.phoneNumberId;

  // Let's query phoneId fields
  const res = await fetch(`https://graph.facebook.com/v19.0/${phoneId}?fields=id,display_phone_number,message_template_namespace,status`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log("Phone query:", await res.json());

  // Let's check /me/accounts, /1021665484225497/whatsapp_business_accounts
  const wabaRes = await fetch(`https://graph.facebook.com/v19.0/1021665484225497/whatsapp_business_accounts`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log("App WABAs:", await wabaRes.json());

  // Check shared WABAs on user
  const userWaba = await fetch(`https://graph.facebook.com/v19.0/122104923849502267/assigned_whatsapp_business_accounts`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log("User WABAs:", await userWaba.json());

  await pool.end();
}

run().catch(console.error);
