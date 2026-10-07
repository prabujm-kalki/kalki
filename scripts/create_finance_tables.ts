import { Client } from 'pg';

async function main() {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  
  try {
    await c.query(`
      CREATE TABLE IF NOT EXISTS "journal_entries" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "organization_id" uuid NOT NULL,
        "entry_number" varchar(50) NOT NULL,
        "entry_date" date NOT NULL,
        "narration" text NOT NULL,
        "source_module" varchar(100) NOT NULL,
        "source_reference_id" text,
        "total_amount" numeric(15, 2) NOT NULL,
        "status" varchar(50) DEFAULT 'DRAFT' NOT NULL,
        "created_by_id" text NOT NULL,
        "approved_by_id" text,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
        CONSTRAINT "journal_entries_org_number_unique" UNIQUE("organization_id","entry_number")
      );
    `);
    console.log("journal_entries created");

    await c.query(`
      CREATE TABLE IF NOT EXISTS "journal_line_items" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "journal_entry_id" uuid NOT NULL,
        "account_id" uuid NOT NULL,
        "location_id" uuid NOT NULL,
        "debit" numeric(15, 2) DEFAULT '0' NOT NULL,
        "credit" numeric(15, 2) DEFAULT '0' NOT NULL,
        "narration" text
      );
    `);
    console.log("journal_line_items created");

    await c.query(`
      CREATE TABLE IF NOT EXISTS "accounting_mappings" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "organization_id" uuid NOT NULL,
        "source_module" varchar(50) NOT NULL,
        "mapping_type" varchar(50) NOT NULL,
        "source_reference_id" varchar(100) NOT NULL,
        "account_id" uuid NOT NULL,
        "is_active" boolean DEFAULT true NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
      );
    `);
    console.log("accounting_mappings created");

  } catch (e: any) {
    console.log("Error:", e.message);
  } finally {
    await c.end();
  }
}

main();
