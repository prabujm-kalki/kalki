const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos'
  });
  
  await client.connect();
  
  try {
    const res = await client.query(`
      ALTER TABLE "purchase_orders" 
      ADD COLUMN IF NOT EXISTS "cashier_bill_amount" numeric,
      ADD COLUMN IF NOT EXISTS "cashier_payment_method" text,
      ADD COLUMN IF NOT EXISTS "cashier_attachments" jsonb,
      ADD COLUMN IF NOT EXISTS "calculated_total" numeric,
      ADD COLUMN IF NOT EXISTS "routing_configuration_id" uuid;
    `);
    console.log("Success adding columns to purchase_orders!");
  } catch (err) {
    console.error("PG ERROR:", err.message);
  }
  
  await client.end();
}

run();
