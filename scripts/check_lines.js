const { Client } = require('pg');

async function checkConstraintsLines() {
  const client = new Client({
    connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos'
  });
  await client.connect();
  const res = await client.query(`
    SELECT column_name, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'b2b_sales_invoice_lines'
      AND is_nullable = 'NO'
      AND column_default IS NULL
  `);
  console.log("REQUIRED COLUMNS WITHOUT DEFAULTS FOR LINES:", res.rows);
  await client.end();
}
checkConstraintsLines();
