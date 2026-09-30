const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://kalki:795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be@localhost:5432/kalki_bos',
});

async function run() {
  await client.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS employee_exits (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL,
        employee_id uuid NOT NULL,
        type text NOT NULL,
        reason text NOT NULL,
        requested_last_working_day date,
        approved_last_working_day date,
        status text NOT NULL DEFAULT 'PENDING',
        requested_at timestamp with time zone NOT NULL DEFAULT now(),
        approved_by uuid,
        review_comment text,
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS employee_exits_employee_idx ON employee_exits(employee_id);
      CREATE INDEX IF NOT EXISTS employee_exits_status_idx ON employee_exits(status);
    `);
    console.log('Table created');
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
