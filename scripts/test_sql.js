const { Client } = require('pg');
async function run() {
  const client = new Client({ connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos' });
  await client.connect();
  const res = await client.query(`
    SELECT 
      id,
      invoice_number,
      grand_total,
      COALESCE((SELECT SUM(CAST(amount_applied AS NUMERIC)) FROM sales_receipt_allocations WHERE invoice_id = b2b_sales_invoices.id), 0) as paidAmount,
      COALESCE((SELECT SUM(CAST(applied_amount AS NUMERIC)) FROM credit_note_applications WHERE applied_to_invoice_id = b2b_sales_invoices.id), 0) as creditApplied
    FROM b2b_sales_invoices 
    WHERE customer_id='6ff4ea17-9096-4aa4-8387-156c786573b7'
  `);
  console.log('Invoices:', res.rows);
  await client.end();
}
run();
