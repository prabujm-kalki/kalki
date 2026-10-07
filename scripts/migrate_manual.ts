import { db } from "../src/db";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Running manual migration...");
  
  try {
    await db.execute(sql`
      ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "process_owner_role_id" uuid;
      ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "review_role_id" uuid;
      ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "bill_review_role_id" uuid;
    `);
    console.log("Added purchase_orders columns");
  } catch (e) {
    console.log("Error or already exists for purchase_orders", e);
  }

  try {
    await db.execute(sql`
      ALTER TABLE "purchase_schedules" ADD COLUMN IF NOT EXISTS "review_role_id" uuid;
      ALTER TABLE "purchase_schedules" ADD COLUMN IF NOT EXISTS "bill_review_role_id" uuid;
    `);
    console.log("Added purchase_schedules columns");
  } catch (e) {
    console.log("Error or already exists for purchase_schedules", e);
  }

  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "approval_limits" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "organization_id" uuid NOT NULL,
        "role_id" uuid NOT NULL,
        "module" text NOT NULL,
        "max_limit" numeric NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp with time zone NOT NULL DEFAULT now()
      );
    `);
    console.log("Created approval_limits table");
  } catch (e) {
    console.log("Error creating approval_limits", e);
  }

  console.log("Manual migration complete.");
  process.exit(0);
}
run();
