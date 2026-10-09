const { Client } = require('pg');
async function run() {
  const c = new Client({ connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos' });
  await c.connect();
  try {
    await c.query(`
      CREATE TABLE IF NOT EXISTS sales_receipt_allocations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        receipt_id uuid NOT NULL,
        invoice_id uuid NOT NULL,
        amount_applied text NOT NULL,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL
      );
    `);
    console.log('Created sales_receipt_allocations');
  } catch(e) { console.error('Error:', e.message); }
  await c.end();
}
run();
