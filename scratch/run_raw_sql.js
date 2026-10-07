const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

async function runRawSql() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "tmbill_orders" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "organization_id" uuid NOT NULL,
        "location_id" uuid,
        "tmbill_order_id" text NOT NULL,
        "tmbill_order_display_id" text,
        "table_name" text,
        "customer_name" text,
        "customer_phone" text,
        "order_state" text,
        "order_subtotal" numeric(12, 2),
        "order_total" numeric(12, 2),
        "order_date_time" timestamp with time zone,
        "payment_mode" text,
        "is_synced_to_finance" boolean DEFAULT false NOT NULL,
        "finance_journal_entry_id" uuid,
        "finance_sales_invoice_id" uuid,
        "raw_data" jsonb NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS "tmbill_order_items" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "organization_id" uuid NOT NULL,
        "order_id" uuid NOT NULL REFERENCES "public"."tmbill_orders"("id") ON DELETE cascade,
        "tmbill_item_id" text NOT NULL,
        "title" text NOT NULL,
        "quantity" numeric(10, 3) NOT NULL,
        "price" numeric(12, 2) NOT NULL,
        "total_with_tax" numeric(12, 2) NOT NULL,
        "total_tax" numeric(12, 2) NOT NULL,
        "product_group_name" text,
        "raw_data" jsonb NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS "tmbill_sync_logs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "organization_id" uuid NOT NULL,
        "location_id" uuid,
        "sync_type" text NOT NULL,
        "status" text NOT NULL,
        "records_processed" integer DEFAULT 0 NOT NULL,
        "records_failed" integer DEFAULT 0 NOT NULL,
        "started_at" timestamp with time zone DEFAULT now() NOT NULL,
        "completed_at" timestamp with time zone,
        "error_details" text,
        "metadata" jsonb DEFAULT '{}'::jsonb
      );
    `);
    console.log("Raw SQL applied successfully.");
  } catch (error) {
    console.error("Error applying SQL:", error);
  } finally {
    process.exit(0);
  }
}
runRawSql();
