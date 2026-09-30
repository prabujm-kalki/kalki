const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos'
  });
  
  await client.connect();
  
  try {
    // Delete duplicate vendor items (keep the one with the latest updated_at or lowest id)
    const res = await client.query(`
      DELETE FROM vendor_items
      WHERE id IN (
        SELECT id
        FROM (
          SELECT id,
          ROW_NUMBER() OVER( PARTITION BY vendor_id, item_id ORDER BY id ) as row_num
          FROM vendor_items
        ) t
        WHERE t.row_num > 1
      );
    `);
    console.log("Deleted duplicates:", res.rowCount);
  } catch (err) {
    console.error("Error:", err.message);
  }
  
  await client.end();
}

run();
