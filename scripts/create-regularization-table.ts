import { db } from "../src/db";
import { sql } from "drizzle-orm";

async function main() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "attendance_regularization_requests" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
        "location_id" uuid NOT NULL REFERENCES "locations"("id"),
        "employee_id" uuid NOT NULL REFERENCES "employees"("id"),
        "date" date NOT NULL,
        "requested_punch_type" varchar(20) NOT NULL,
        "requested_time" timestamp with time zone NOT NULL,
        "reason" text NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'PENDING',
        "approved_by" uuid REFERENCES "employees"("id"),
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp with time zone NOT NULL DEFAULT now()
      );
    `);
    console.log("Successfully created attendance_regularization_requests table");
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
main();
