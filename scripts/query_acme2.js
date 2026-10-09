const { Client } = require('pg');
async function run() {
  const client = new Client({ connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos' });
  await client.connect();
  
  const credits = await client.query("SELECT * FROM credit_notes WHERE customer_id='6ff4ea17-9096-4aa4-8387-156c786573b7'");
  console.log('Credit Notes:', credits.rows);
  
  await client.end();
}
run();
