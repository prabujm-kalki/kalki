const { Client } = require('pg');

async function restoreColumn() {
  const client = new Client({
    connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos'
  });

  try {
    await client.connect();
    
    // Add primary_sales_source to organizations if it doesn't exist
    await client.query(`
      ALTER TABLE organizations 
      ADD COLUMN IF NOT EXISTS primary_sales_source TEXT NOT NULL DEFAULT 'Hybrid';
    `);
    
    console.log("Successfully restored primary_sales_source column to organizations");
    
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

restoreColumn();
