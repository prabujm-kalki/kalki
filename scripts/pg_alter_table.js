const { Client } = require('pg');

async function addColumn() {
  const client = new Client({
    connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos'
  });

  try {
    await client.connect();
    
    // Add tmbill_raw_data to b2b_sales_invoices if it doesn't exist
    await client.query(`
      ALTER TABLE b2b_sales_invoices 
      ADD COLUMN IF NOT EXISTS tmbill_raw_data JSONB;
    `);
    
    console.log("Successfully added tmbill_raw_data column to b2b_sales_invoices");
    
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

addColumn();
