const { Client } = require('pg');

async function run() {
  const client = new Client({ connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos' });
  await client.connect();
  
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS refunds (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL REFERENCES organizations(id),
        location_id uuid NOT NULL REFERENCES locations(id),
        credit_note_id uuid NOT NULL REFERENCES credit_notes(id),
        customer_id uuid NOT NULL REFERENCES customers(id),
        amount numeric NOT NULL,
        payment_method varchar(50) NOT NULL,
        reference_number varchar(255),
        notes text,
        refund_date timestamp with time zone NOT NULL DEFAULT now(),
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now()
      );
    `);
    console.log("Table 'refunds' created successfully!");
  } catch (err) {
    console.error("Error creating table:", err);
  } finally {
    await client.end();
  }
}

run();
