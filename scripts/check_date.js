const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://postgres:postgres@localhost:5432/kalki_bos' });
pool.query("SELECT invoice_number, invoice_date FROM b2b_sales_invoices WHERE invoice_number = 'TM-1g4ampyWbrOJFzgyijLQ2025'").then(r => {
  const dateStr = r.rows[0].invoice_date;
  const d = new Date(dateStr);
  console.log('From pg driver (Date object stringified):', dateStr);
  console.log('Resulting format:', d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: '2-digit', year: 'numeric' }));
}).catch(console.error).finally(() => process.exit());
