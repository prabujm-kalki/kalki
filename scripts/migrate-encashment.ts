import { config } from "dotenv";
config({ path: ".env" });
import { db } from "../src/db";
import { sql } from "drizzle-orm";

async function run() {
  try {
    await db.execute(sql`
      ALTER TABLE leave_types 
      ADD COLUMN IF NOT EXISTS encashment_min_tenure_days INTEGER DEFAULT 365 NOT NULL,
      ADD COLUMN IF NOT EXISTS encashment_min_balance_retained NUMERIC(5,2) DEFAULT '3.00' NOT NULL,
      ADD COLUMN IF NOT EXISTS encashment_only_at_year_end BOOLEAN DEFAULT true NOT NULL;
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS leave_encashment_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        location_id UUID NOT NULL,
        employee_id UUID NOT NULL,
        leave_type_id UUID NOT NULL,
        encashment_days NUMERIC(4,2) NOT NULL,
        status VARCHAR(30) DEFAULT 'PENDING' NOT NULL,
        payroll_processed BOOLEAN DEFAULT false NOT NULL,
        reason TEXT NOT NULL,
        approver_id UUID,
        actioned_by TEXT,
        actioned_at TIMESTAMPTZ,
        rejection_reason TEXT,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
      );
    `);
    console.log("Migration successful");
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}
run();
