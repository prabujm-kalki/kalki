import { db } from "./src/db";
import { sql } from "drizzle-orm";

async function run() {
  try {
    console.log("Creating fixed_assets table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "fixed_assets" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "organization_id" uuid NOT NULL,
        "location_id" uuid NOT NULL,
        "name" text NOT NULL,
        "asset_code" text NOT NULL,
        "purchase_date" date NOT NULL,
        "purchase_price" numeric NOT NULL,
        "current_value" numeric NOT NULL,
        "depreciation_rate" numeric NOT NULL,
        "depreciation_method" text NOT NULL,
        "asset_account_id" uuid NOT NULL,
        "depreciation_account_id" uuid NOT NULL,
        "depreciation_expense_account_id" uuid NOT NULL,
        "is_active" boolean DEFAULT true NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
      );
    `);
    console.log("Success!");
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

run();
