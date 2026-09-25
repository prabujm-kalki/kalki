import { db } from "./src/db";
import { sql } from "drizzle-orm";

async function main() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "salary_advances" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE RESTRICT,
        "location_id" uuid NOT NULL REFERENCES "locations"("id") ON DELETE RESTRICT,
        "employee_id" uuid NOT NULL REFERENCES "employees"("id") ON DELETE RESTRICT,
        "amount" numeric NOT NULL,
        "reason" text,
        "status" varchar(50) NOT NULL DEFAULT 'PENDING',
        "date_given" timestamp with time zone,
        "repayment_method" varchar(50) DEFAULT 'DEDUCT_FROM_PAYROLL',
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp with time zone NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS "payroll_runs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE RESTRICT,
        "location_id" uuid NOT NULL REFERENCES "locations"("id") ON DELETE RESTRICT,
        "period_start" date NOT NULL,
        "period_end" date NOT NULL,
        "run_date" timestamp with time zone NOT NULL DEFAULT now(),
        "status" varchar(50) NOT NULL DEFAULT 'DRAFT',
        "total_gross_amount" numeric NOT NULL DEFAULT '0',
        "total_deductions" numeric NOT NULL DEFAULT '0',
        "total_net_amount" numeric NOT NULL DEFAULT '0',
        "processed_by_user_id" text NOT NULL REFERENCES "user"("id") ON DELETE RESTRICT,
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp with time zone NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS "payslips" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "payroll_run_id" uuid NOT NULL REFERENCES "payroll_runs"("id") ON DELETE CASCADE,
        "employee_id" uuid NOT NULL REFERENCES "employees"("id") ON DELETE RESTRICT,
        "total_present_days" numeric NOT NULL DEFAULT '0',
        "total_absent_days" numeric NOT NULL DEFAULT '0',
        "gross_amount" numeric NOT NULL DEFAULT '0',
        "deductions_amount" numeric NOT NULL DEFAULT '0',
        "net_amount" numeric NOT NULL DEFAULT '0',
        "status" varchar(50) NOT NULL DEFAULT 'DRAFT',
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp with time zone NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS "salary_advance_repayments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "advance_id" uuid NOT NULL REFERENCES "salary_advances"("id") ON DELETE CASCADE,
        "amount" numeric NOT NULL,
        "payslip_id" uuid REFERENCES "payslips"("id") ON DELETE RESTRICT,
        "repayment_date" timestamp with time zone NOT NULL DEFAULT now(),
        "method" varchar(50) NOT NULL,
        "created_at" timestamp with time zone NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS "payslip_components" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "payslip_id" uuid NOT NULL REFERENCES "payslips"("id") ON DELETE CASCADE,
        "component_id" uuid REFERENCES "salary_components"("id") ON DELETE RESTRICT,
        "component_name" varchar(255) NOT NULL,
        "type" varchar(50) NOT NULL,
        "amount" numeric NOT NULL
      );
    `);
    console.log("Migration applied successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

main();
