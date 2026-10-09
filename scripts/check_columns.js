const { Client } = require('pg');

async function test() {
  const client = new Client({
    connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos'
  });
  await client.connect();
  const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'b2b_sales_invoices'");
  console.log(res.rows.map(r => r.column_name));
  await client.end();
}
test();
