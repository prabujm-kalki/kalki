import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

async function run() {
  const { db } = await import('../src/db/index');
  const { sql } = await import('drizzle-orm');
  
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "sales_channels" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "location_id" uuid REFERENCES "locations"("id") ON DELETE SET NULL,
        "name" text NOT NULL,
        "type" text NOT NULL,
        "fulfillment_type" text NOT NULL DEFAULT 'IMMEDIATE',
        "requires_dispatch" boolean DEFAULT false,
        "default_tax_slab_id" uuid,
        "platform_fee_percentage" numeric(5, 2),
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp with time zone NOT NULL DEFAULT now()
      );
    `);
    console.log("Created sales_channels table.");

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "pricing_rules" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
        "location_id" uuid REFERENCES "locations"("id") ON DELETE SET NULL,
        "name" text NOT NULL,
        "description" text,
        "rule_type" text NOT NULL,
        "priority" integer NOT NULL DEFAULT 0,
        "conditions" jsonb NOT NULL,
        "actions" jsonb NOT NULL,
        "requires_approval" boolean DEFAULT false,
        "approval_role_level" text,
        "is_active" boolean NOT NULL DEFAULT true,
        "valid_from" timestamp with time zone,
        "valid_until" timestamp with time zone,
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp with time zone NOT NULL DEFAULT now()
      );
    `);
    console.log("Created pricing_rules table.");
    
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();
