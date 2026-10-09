require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');
async function run() {
  const c = new Client({ connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos' });
  await c.connect();
  try {
    const res = await c.query(`SELECT SUM(CASE WHEN date_trunc('month', invoice_date) = date_trunc('month', CURRENT_DATE) THEN CAST(total_amount AS NUMERIC) ELSE 0 END) FROM b2b_sales_invoices`);
    console.log('Query 1 success', res.rows);
  } catch(e) { console.error('Error 1:', e.message); }
  
  try {
    const res = await c.query(`SELECT SUM(CASE WHEN CURRENT_DATE > due_date THEN (CAST(total_amount AS NUMERIC) - COALESCE((SELECT SUM(CAST(amount_applied AS NUMERIC)) FROM sales_receipt_allocations WHERE invoice_id = b2b_sales_invoices.id), 0)) ELSE 0 END) FROM b2b_sales_invoices`);
    console.log('Query 2 success', res.rows);
  } catch(e) { console.error('Error 2:', e.message); }
  
  await c.end();
}
run();
