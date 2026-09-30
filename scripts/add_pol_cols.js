const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos'
  });
  
  await client.connect();
  
  try {
    const res = await client.query(`
      ALTER TABLE "purchase_order_lines" 
      ADD COLUMN IF NOT EXISTS "received_quantity" numeric,
      ADD COLUMN IF NOT EXISTS "verified_unit_rate" numeric,
      ADD COLUMN IF NOT EXISTS "receiving_status" text;
    `);
    console.log("Success adding columns to purchase_order_lines!");
  } catch (err) {
    console.error("PG ERROR:", err.message);
  }
  
  await client.end();
}

run();
