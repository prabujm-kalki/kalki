import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

async function run() {
  const { db } = await import('../src/db/index');
  const { sql } = await import('drizzle-orm');
  
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "sales_orders" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "location_id" uuid NOT NULL REFERENCES "locations"("id") ON DELETE CASCADE,
        "channel_id" uuid NOT NULL REFERENCES "sales_channels"("id") ON DELETE RESTRICT,
        "order_number" text NOT NULL,
        "status" text NOT NULL DEFAULT 'DRAFT',
        "customer_id" uuid,
        "customer_name" text,
        "customer_contact" text,
        "gross_amount" numeric(12, 2) NOT NULL,
        "discount_amount" numeric(12, 2) NOT NULL DEFAULT '0',
        "tax_amount" numeric(12, 2) NOT NULL DEFAULT '0',
        "net_amount" numeric(12, 2) NOT NULL,
        "applied_pricing_rules" jsonb DEFAULT '[]'::jsonb,
        "tax_breakdown" jsonb DEFAULT '{}'::jsonb,
        "order_timestamp" timestamp with time zone NOT NULL DEFAULT now(),
        "fulfillment_timestamp" timestamp with time zone,
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp with time zone NOT NULL DEFAULT now()
      );
    `);
    console.log("Created sales_orders table.");

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "sales_order_lines" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "order_id" uuid NOT NULL REFERENCES "sales_orders"("id") ON DELETE CASCADE,
        "item_id" text NOT NULL,
        "item_name" text NOT NULL,
        "quantity" numeric(10, 3) NOT NULL,
        "unit_price" numeric(12, 2) NOT NULL,
        "gross_amount" numeric(12, 2) NOT NULL,
        "discount_amount" numeric(12, 2) NOT NULL DEFAULT '0',
        "tax_amount" numeric(12, 2) NOT NULL DEFAULT '0',
        "net_amount" numeric(12, 2) NOT NULL,
        "notes" text
      );
    `);
    console.log("Created sales_order_lines table.");
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "sales_invoices" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "location_id" uuid NOT NULL REFERENCES "locations"("id") ON DELETE CASCADE,
        "order_id" uuid NOT NULL REFERENCES "sales_orders"("id") ON DELETE RESTRICT,
        "invoice_number" text NOT NULL UNIQUE,
        "net_amount" numeric(12, 2) NOT NULL,
        "tax_breakdown" jsonb NOT NULL,
        "payment_status" text NOT NULL DEFAULT 'PENDING',
        "invoice_timestamp" timestamp with time zone NOT NULL DEFAULT now(),
        "created_at" timestamp with time zone NOT NULL DEFAULT now()
      );
    `);
    console.log("Created sales_invoices table.");
    
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();
