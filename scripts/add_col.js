const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos'
  });
  
  await client.connect();
  
  try {
    await client.query('ALTER TABLE items ADD COLUMN target_stock numeric;');
    console.log("Successfully added target_stock to items table");
  } catch (err) {
    console.error("Error adding column (maybe it exists?):", err.message);
  }
  
  await client.end();
}

run();
