const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos' });

async function run() {
  const orgRes = await pool.query("SELECT whatsapp_config FROM organizations WHERE id = 'b5334ab2-b652-432b-8c16-774c90406261'");
  const cfg = orgRes.rows[0].whatsapp_config;
  const token = cfg.apiToken;
  const phoneId = cfg.phoneNumberId;

  const names = [
    "deepavali",
    "diwali",
    "deepavali_offer",
    "diwali_offer",
    "deepavali_special",
    "diwali_special",
    "diwali_offer_special",
    "deepavali_offer_special",
    "deepavali_blast",
    "diwali_blast",
    "diwali_festival_special",
    "deepavali_festival_special",
    "deepavali_festival",
    "diwali_festival",
    "deepavali_wishes",
    "diwali_wishes",
    "happy_diwali",
    "happy_deepavali",
    "kalki_diwali",
    "kalki_deepavali",
    "diwali_promo",
    "deepavali_promo",
    "diwali_campaign",
    "deepavali_campaign"
  ];

  const langs = ["en", "en_US", "en_GB", "ta"];

  console.log("Checking template variations against Meta API...");

  for (const name of names) {
    for (const lang of langs) {
      // Test without params
      const res0 = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: "919790014356",
          type: "template",
          template: {
            name,
            language: { code: lang }
          }
        })
      });
      const data0 = await res0.json();
      
      if (res0.ok) {
        console.log(`\n🎉🎉🎉 EXACT MATCH FOUND (0 params)! Name: "${name}", Lang: "${lang}" -> Message ID:`, data0.messages?.[0]?.id);
        await pool.end();
        return;
      }

      // Check if error is NOT 132001 (e.g. parameter mismatch error 132000 or similar)
      if (data0.error?.code !== 132001) {
        console.log(`\n🔥 TEMPLATE FOUND (Parameter mismatch)! Name: "${name}", Lang: "${lang}" -> Code: ${data0.error?.code}: ${data0.error?.message}`);
      }

      // Test with 1 param
      const res1 = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: "919790014356",
          type: "template",
          template: {
            name,
            language: { code: lang },
            components: [
              {
                type: "body",
                parameters: [{ type: "text", text: "Prabhu" }]
              }
            ]
          }
        })
      });
      const data1 = await res1.json();
      if (res1.ok) {
        console.log(`\n🎉🎉🎉 EXACT MATCH FOUND (1 param)! Name: "${name}", Lang: "${lang}" -> Message ID:`, data1.messages?.[0]?.id);
        await pool.end();
        return;
      }
      if (data1.error?.code !== 132001) {
        console.log(`\n🔥 TEMPLATE FOUND (1 param response)! Name: "${name}", Lang: "${lang}" -> Code: ${data1.error?.code}: ${data1.error?.message}`);
      }
    }
  }

  console.log("No match found in current list.");
  await pool.end();
}

run().catch(console.error);
