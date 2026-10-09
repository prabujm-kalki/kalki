const { Client } = require('pg');
async function run() {
  const c = new Client({ connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos' });
  await c.connect();
  const res = await c.query(`
    SELECT i.invoice_number, i.customer_name, i.payment_status, o.payment_mode 
    FROM b2b_sales_invoices i 
    JOIN tmbill_orders o ON 'TM-' || o.tmbill_order_id = i.invoice_number 
    WHERE i.payment_status = 'PENDING' AND (o.payment_mode IS NOT NULL AND LOWER(o.payment_mode) NOT IN ('credit', 'unpaid'));
  `);
  console.log('Mismatched invoices:', res.rows);
  
  if (res.rows.length > 0) {
    const updateRes = await c.query(`
      UPDATE b2b_sales_invoices i 
      SET payment_status = 'PAID', payment_mode = o.payment_mode, status = 'paid'
      FROM tmbill_orders o 
      WHERE 'TM-' || o.tmbill_order_id = i.invoice_number 
      AND i.payment_status = 'PENDING' 
      AND (o.payment_mode IS NOT NULL AND LOWER(o.payment_mode) NOT IN ('credit', 'unpaid'));
    `);
    console.log('Fixed', updateRes.rowCount, 'invoices');
  }
  await c.end();
}
run();
