const { Client } = require('pg');
async function run() {
  const c = new Client({ connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos' });
  await c.connect();
  try {
    await c.query(`
      CREATE TABLE IF NOT EXISTS sales_credit_notes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL,
        location_id uuid NOT NULL,
        customer_id uuid NOT NULL,
        invoice_id uuid,
        credit_note_number text NOT NULL UNIQUE,
        issue_date timestamp NOT NULL,
        amount numeric NOT NULL,
        reason text NOT NULL,
        status text NOT NULL DEFAULT 'issued',
        created_at timestamp DEFAULT now() NOT NULL
      );
    `);
    console.log('sales_credit_notes created!');
  } catch(e) { console.error('Error sales_credit_notes:', e.message); }
  
  await c.end();
}
run();
