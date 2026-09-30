import { db } from "./src/db/index.ts";
import { sql } from "drizzle-orm";

async function run() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "advance_type_definitions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
        "location_id" uuid REFERENCES "locations"("id"),
        "code" varchar(50) NOT NULL,
        "name" varchar(255) NOT NULL,
        "calculation_basis" varchar(50),
        "max_cap_percentage" integer,
        "max_count_monthly" integer,
        "max_count_weekly" integer,
        "min_tenure_days" integer,
        "min_notice_days" integer,
        "min_cycle_days_worked" integer,
        "holdback_days" integer,
        "max_repayment_months" integer,
        "allowed_payment_modes" varchar(255),
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp with time zone NOT NULL DEFAULT now()
      );
      
      CREATE TABLE IF NOT EXISTS "employee_advance_requests" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
        "location_id" uuid NOT NULL REFERENCES "locations"("id"),
        "employee_id" uuid NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
        "advance_type_id" uuid NOT NULL REFERENCES "advance_type_definitions"("id"),
        "requested_amount" numeric NOT NULL,
        "approved_amount" numeric,
        "repayment_months" integer,
        "payment_mode" varchar(50),
        "status" varchar(50) NOT NULL DEFAULT 'PENDING',
        "repaid_amount" numeric DEFAULT '0',
        "remaining_balance" numeric DEFAULT '0',
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp with time zone NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS "advance_repayment_schedules" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "request_id" uuid NOT NULL REFERENCES "employee_advance_requests"("id") ON DELETE CASCADE,
        "installment_number" integer NOT NULL,
        "expected_deduction_month" varchar(20),
        "expected_deduction_year" integer,
        "installment_amount" numeric NOT NULL,
        "status" varchar(50) NOT NULL DEFAULT 'PENDING',
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp with time zone NOT NULL DEFAULT now()
      );
    `);
    console.log("Advances Tables created successfully.");
  } catch (e) {
    console.error("Error creating tables:", e);
  } finally {
    process.exit(0);
  }
}
run();
