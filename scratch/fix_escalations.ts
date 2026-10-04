import { db } from "../src/db";
import { taskInstances, businessRoles } from "../src/db/schema";
import { eq, and, isNull } from "drizzle-orm";

async function fix() {
  try {
    // Get all Owner roles
    const ownerRoles = await db.select().from(businessRoles).where(eq(businessRoles.name, "Owner"));
    if (ownerRoles.length === 0) {
      console.log("No Owner roles found.");
      process.exit(0);
    }

    // Since there could be multiple orgs, we just iterate or do a mass update for now
    for (const ownerRole of ownerRoles) {
      const updated = await db.update(taskInstances)
        .set({ assignedRoleId: ownerRole.id })
        .where(
          and(
            eq(taskInstances.organizationId, ownerRole.organizationId),
            isNull(taskInstances.assignedRoleId),
            eq(taskInstances.priority, "high")
          )
        )
        .returning();
      
      console.log(`Updated ${updated.length} tasks for org ${ownerRole.organizationId}`);
    }
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

fix();
