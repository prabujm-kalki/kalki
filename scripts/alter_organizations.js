const { Client } = require('pg');

async function alterTable() {
  const client = new Client({
    connectionString: "postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos"
  });
  
  try {
    await client.connect();
    console.log("Connected");

    await client.query(`
      ALTER TABLE organizations 
      ADD COLUMN IF NOT EXISTS return_policies jsonb DEFAULT '{"maxReturnDays": 30, "allowMultipleReturns": true, "requireApproval": true, "applyRestockingFee": "None"}'::jsonb;
    `);

    console.log("Organizations table altered successfully");
  } catch (err) {
    console.error("PG ERROR:", err.message);
  } finally {
    await client.end();
  }
}

alterTable();
