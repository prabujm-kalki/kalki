const { Client } = require('pg');
async function run() {
  const c = new Client({ connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos' });
  await c.connect();
  try {
    const res = await c.query(`SELECT count(*) FROM sales_receipts;`);
    console.log('sales_receipts exists:', res.rows[0]);
  } catch(e) { console.error('Error sales_receipts:', e.message); }
  
  try {
    const res2 = await c.query(`SELECT count(*) FROM sales_credit_notes;`);
    console.log('sales_credit_notes exists:', res2.rows[0]);
  } catch(e) { console.error('Error sales_credit_notes:', e.message); }
  
  await c.end();
}
run();
