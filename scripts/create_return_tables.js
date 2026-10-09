const { Client } = require('pg');

async function createTables() {
  const client = new Client({
    connectionString: "postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos"
  });
  
  try {
    await client.connect();
    console.log("Connected");

    await client.query(`
      CREATE TABLE IF NOT EXISTS sales_returns (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL,
        location_id uuid NOT NULL,
        return_number varchar(50) NOT NULL,
        invoice_id uuid,
        return_date timestamp with time zone NOT NULL DEFAULT now(),
        status text NOT NULL DEFAULT 'DRAFT',
        total_amount numeric NOT NULL,
        reason text,
        created_user_id text,
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS sales_return_lines (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        return_id uuid NOT NULL REFERENCES sales_returns(id) ON DELETE CASCADE,
        item_id uuid NOT NULL,
        description text,
        return_qty numeric NOT NULL,
        unit_price numeric NOT NULL,
        add_to_inventory boolean NOT NULL DEFAULT true
      );
    `);

    console.log("Tables created successfully");
  } catch (err) {
    console.error("PG ERROR:", err.message);
  } finally {
    await client.end();
  }
}

createTables();
