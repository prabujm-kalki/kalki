import "dotenv/config";
import { db } from "../src/db";
import { roles, businessRoles, organizations } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function backfillRoles() {
  console.log("Starting roles backfill...");

  try {
    // 1. Get an active organization (assume there's at least one main org)
    const orgs = await db.select().from(organizations).limit(1);
    if (orgs.length === 0) {
      console.log("No organizations found. Cannot backfill roles without an organization ID.");
      process.exit(1);
    }
    const orgId = orgs[0].id;

    // 2. Fetch all application roles
    const allRoles = await db.select().from(roles);
    let backfilledCount = 0;

    // 3. Check and insert into businessRoles if missing
    for (const role of allRoles) {
      const existingBusinessRole = await db.select().from(businessRoles).where(eq(businessRoles.id, role.id));
      
      if (existingBusinessRole.length === 0) {
        console.log(`Backfilling missing businessRole for: ${role.name} (${role.code})`);
        
        await db.insert(businessRoles).values({
          id: role.id,
          organizationId: orgId,
          name: role.name,
          identifier: role.code,
          purpose: `Unified application role for ${role.name} (Backfilled)`,
          isActive: true,
        });
        
        backfilledCount++;
      }
    }

    console.log(`\nBackfill complete! Successfully synced ${backfilledCount} legacy roles to the People module.`);
    process.exit(0);
  } catch (error) {
    console.error("Error during backfill:", error);
    process.exit(1);
  }
}

backfillRoles();
