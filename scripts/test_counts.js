const { Client } = require('pg');
async function run() {
  const c = new Client({ connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos' });
  await c.connect();
  const res = await c.query(`
    SELECT * FROM b2b_sales_invoices;
  `);
  console.log('Invoices Count:', res.rows.length);
  
  const custRes = await c.query(`
    SELECT c.id, c.name, COALESCE(SUM(i.total_amount), 0)
    FROM customers c
    LEFT JOIN b2b_sales_invoices i ON c.id = i.customer_id
    GROUP BY c.id;
  `);
  console.log('Customers Count:', custRes.rows.length);
  await c.end();
}
run();
