import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const sql = `
    ALTER TABLE "purchase_debit_notes" ALTER COLUMN "status" SET DEFAULT 'draft';
    ALTER TABLE "purchase_debit_notes" ADD COLUMN IF NOT EXISTS "created_by_user_id" text;
    ALTER TABLE "purchase_debit_notes" ADD COLUMN IF NOT EXISTS "approved_by_user_id" text;
    
    DO $$ BEGIN
      ALTER TABLE "purchase_debit_notes" ADD CONSTRAINT "purchase_debit_notes_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
    
    DO $$ BEGIN
      ALTER TABLE "purchase_debit_notes" ADD CONSTRAINT "purchase_debit_notes_approved_by_user_id_user_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `;
  
  try {
    await pool.query(sql);
    console.log("SQL successfully applied.");
  } catch (err) {
    console.error("Error applying SQL:", err);
  } finally {
    pool.end();
  }
}

run();
