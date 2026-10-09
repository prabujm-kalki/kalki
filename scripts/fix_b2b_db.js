require('dotenv').config({path: '.env'});
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/kalki' });
async function run() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL,
        name text NOT NULL,
        email text,
        phone text,
        address text,
        tax_id text,
        credit_limit numeric,
        credit_terms_days integer,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL
      );
      CREATE TABLE IF NOT EXISTS b2b_sales_invoices (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL,
        location_id uuid NOT NULL,
        session_id uuid,
        issue_date timestamp NOT NULL,
        total_amount numeric NOT NULL,
        tax_amount numeric DEFAULT '0' NOT NULL,
        invoice_number text NOT NULL UNIQUE,
        invoice_date timestamp DEFAULT now() NOT NULL,
        due_date timestamp,
        customer_id uuid NOT NULL REFERENCES customers(id),
        customer_name text NOT NULL,
        customer_gstin text,
        billing_address text,
        subtotal_amount numeric(12,2) NOT NULL,
        discount_amount numeric(12,2) DEFAULT '0.00' NOT NULL,
        taxable_amount numeric(12,2) NOT NULL,
        cgst_amount numeric(12,2) DEFAULT '0.00' NOT NULL,
        sgst_amount numeric(12,2) DEFAULT '0.00' NOT NULL,
        igst_amount numeric(12,2) DEFAULT '0.00' NOT NULL,
        round_off_amount numeric(6,2) DEFAULT '0.00' NOT NULL,
        grand_total numeric(12,2) NOT NULL,
        payment_status text NOT NULL,
        payment_mode text NOT NULL,
        status text DEFAULT 'ISSUED' NOT NULL,
        created_user_id text NOT NULL,
        created_at timestamp DEFAULT now() NOT NULL
      );
      CREATE TABLE IF NOT EXISTS b2b_sales_invoice_lines (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_id uuid NOT NULL REFERENCES b2b_sales_invoices(id),
        description text NOT NULL,
        unit_price numeric NOT NULL,
        total_amount numeric NOT NULL,
        item_id uuid NOT NULL,
        item_description text NOT NULL,
        hsn_code text,
        uom text NOT NULL,
        quantity numeric(12,3) NOT NULL,
        unit_rate numeric(12,2) NOT NULL,
        discount_percent numeric(5,2) DEFAULT '0.00' NOT NULL,
        discount_amount numeric(12,2) DEFAULT '0.00' NOT NULL,
        taxable_amount numeric(12,2) NOT NULL,
        gst_rate numeric(5,2) NOT NULL,
        cgst_amount numeric(12,2) DEFAULT '0.00' NOT NULL,
        sgst_amount numeric(12,2) DEFAULT '0.00' NOT NULL,
        igst_amount numeric(12,2) DEFAULT '0.00' NOT NULL,
        line_total numeric(12,2) NOT NULL
      );
    `);
    console.log('Tables created successfully');
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();
