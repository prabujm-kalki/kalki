const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos' });

async function register() {
  const org = await pool.query("SELECT whatsapp_config FROM organizations WHERE id = 'b5334ab2-b652-432b-8c16-774c90406261'");
  const { phoneNumberId, apiToken } = org.rows[0].whatsapp_config;
  console.log("Registering Phone Number ID:", phoneNumberId);

  const res = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiToken}`
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      pin: "526615"
    })
  });

  const data = await res.json();
  console.log("Meta Registration Result:", JSON.stringify(data, null, 2));

  // Check phone status after registration
  const phoneRes = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}?fields=display_phone_number,verified_name,status,code_verification_status,quality_rating`, {
    headers: { Authorization: `Bearer ${apiToken}` }
  });
  console.log("Updated Phone Status:", JSON.stringify(await phoneRes.json(), null, 2));

  await pool.end();
}

register().catch(console.error);
