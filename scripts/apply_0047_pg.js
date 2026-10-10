const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  await client.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS "pos_channel_mappings" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "organization_id" uuid NOT NULL,
        "location_id" uuid,
        "provider_name" varchar(50) NOT NULL,
        "external_string" varchar(100) NOT NULL,
        "internal_channel_id" uuid NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);
    
    // Check constraints
    const checks = [
      {
        name: 'pos_channel_mappings_organization_id_organizations_id_fk',
        sql: 'ALTER TABLE "pos_channel_mappings" ADD CONSTRAINT "pos_channel_mappings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;'
      },
      {
        name: 'pos_channel_mappings_location_id_locations_id_fk',
        sql: 'ALTER TABLE "pos_channel_mappings" ADD CONSTRAINT "pos_channel_mappings_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;'
      },
      {
        name: 'pos_channel_mappings_internal_channel_id_sales_channels_id_fk',
        sql: 'ALTER TABLE "pos_channel_mappings" ADD CONSTRAINT "pos_channel_mappings_internal_channel_id_sales_channels_id_fk" FOREIGN KEY ("internal_channel_id") REFERENCES "public"."sales_channels"("id") ON DELETE no action ON UPDATE no action;'
      }
    ];

    for (const check of checks) {
      const res = await client.query(`SELECT 1 FROM pg_constraint WHERE conname = $1;`, [check.name]);
      if (res.rowCount === 0) {
        await client.query(check.sql);
      }
    }

    const hash = 'mockhash_0047_good_deadpool_scripted';
    await client.query(`
      INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
      VALUES ($1, $2)
    `, [hash, Date.now()]);
    
    console.log("Migration 0047 applied successfully");
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await client.end();
  }
}

run();
