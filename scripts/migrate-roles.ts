import { db } from "../src/db/index";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Migrating business_roles to roles...");
  try {
    // Add columns directly in Postgres if they don't exist
    await db.execute(sql`ALTER TABLE roles ADD COLUMN IF NOT EXISTS organization_id uuid;`);
    await db.execute(sql`ALTER TABLE roles ADD COLUMN IF NOT EXISTS location_id uuid;`);

    // Copy data
    const result = await db.execute(sql`
      INSERT INTO roles (id, code, name, organization_id, location_id, created_at)
      SELECT 
        id, 
        identifier as code, 
        name, 
        organization_id, 
        location_id, 
        created_at
      FROM business_roles
      ON CONFLICT (id) DO UPDATE SET 
        organization_id = EXCLUDED.organization_id,
        location_id = EXCLUDED.location_id;
    `);
    console.log("Migration complete:", result.rowCount, "rows affected.");
  } catch (err) {
    console.error("Migration failed:", err);
  }
  process.exit(0);
}

run();
