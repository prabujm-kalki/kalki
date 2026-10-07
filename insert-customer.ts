import { db } from './src/db';
import { sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';

async function run() {
  try {
    console.log("Creating customers table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS customers (
        id uuid PRIMARY KEY,
        organization_id uuid NOT NULL REFERENCES organizations(id),
        name text NOT NULL,
        email text,
        phone text,
        billing_address text,
        credit_limit numeric(12,2) DEFAULT '0',
        credit_terms_days integer DEFAULT 0,
        is_active boolean DEFAULT true,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      );
    `);
    console.log("Table created!");

    const res = await db.execute(sql`SELECT id FROM organizations LIMIT 1`);
    const orgId = res.rows[0].id;
    
    // Check if customer exists
    const existing = await db.execute(sql`SELECT id FROM customers WHERE organization_id = ${orgId} LIMIT 1`);
    if (existing.rowCount === 0) {
      await db.execute(sql`INSERT INTO customers (id, organization_id, name, email, phone, billing_address, credit_limit, credit_terms_days, is_active, created_at, updated_at) VALUES (${randomUUID()}, ${orgId}, 'Acme Corporation', 'billing@acmecorp.com', '+1-555-0199', '123 Acme Way', '50000.00', 30, true, NOW(), NOW())`);
      console.log('Inserted customer Acme Corporation for org', orgId);
    } else {
      console.log('Customer already exists.');
    }
  } catch(e) {
    console.error('ERROR', e);
  }
  process.exit(0);
}
run();
