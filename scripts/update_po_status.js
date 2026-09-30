const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos'
  });
  
  await client.connect();
  
  try {
    const res = await client.query(`
      UPDATE purchase_orders SET status = 'draft' WHERE status = 'DRAFT';
    `);
    console.log("Updated", res.rowCount, "rows to draft.");
  } catch (err) {
    console.error("PG ERROR:", err.message);
  }
  
  await client.end();
}

run();
