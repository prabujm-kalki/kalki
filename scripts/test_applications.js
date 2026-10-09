const { Client } = require('pg');
async function run() {
  const client = new Client({ connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos' });
  await client.connect();
  const res = await client.query("SELECT * FROM credit_note_applications");
  console.log('Credit Note Applications:', res.rows);
  await client.end();
}
run();
