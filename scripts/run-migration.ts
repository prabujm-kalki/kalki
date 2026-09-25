import { db } from "../src/db";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Running manual migrations...");
  try {
    // Check if department_id exists on employees table
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='department_id') THEN
          ALTER TABLE "employees" ADD COLUMN "department_id" uuid REFERENCES "departments"("id") ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    // Create leave_department_policies table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "leave_department_policies" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "leave_type_id" uuid NOT NULL REFERENCES "leave_types"("id") ON DELETE CASCADE,
        "department_id" uuid NOT NULL REFERENCES "departments"("id") ON DELETE CASCADE,
        "max_concurrent_leaves" integer,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
      );
    `);
    
    console.log("Migrations applied successfully.");
  } catch(e) {
    console.error("Migration failed:", e);
  }
}

run();
