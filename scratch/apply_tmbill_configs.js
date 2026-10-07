const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

async function applySql() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "tmbill_configs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "organization_id" uuid NOT NULL,
        "location_id" uuid,
        "api_url" text NOT NULL DEFAULT 'https://api.tmbill.com/tp/v1',
        "username" text,
        "password" text,
        "store_id" text,
        "tmpos_id" text,
        "business_day_start_time" text NOT NULL DEFAULT '06:00',
        "auto_sync_enabled" boolean NOT NULL DEFAULT false,
        "auto_sync_interval_minutes" integer NOT NULL DEFAULT 60,
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp with time zone NOT NULL DEFAULT now()
      );
    `);
    console.log("Created tmbill_configs table.");
  } catch (error) {
    console.error("Error applying SQL:", error);
  } finally {
    process.exit(0);
  }
}
applySql();
