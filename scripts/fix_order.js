const { Client } = require('pg');

async function run() {
  const c = new Client({ connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos' });
  await c.connect();
  await c.query("UPDATE b2b_sales_invoices SET payment_status = 'PENDING', payment_mode = 'CREDIT' WHERE invoice_number = 'TM-1g4ampyWbrOJFzgyijLQ2025'");
  console.log('Fixed invoice in DB');
  await c.end();
}
run();
