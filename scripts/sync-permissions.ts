import { db } from "../src/db";
import { permissions } from "../src/db/schema";
import { PERMISSIONS_REGISTRY } from "../src/lib/permissions-registry";

async function syncPermissions() {
  console.log("Starting Automated Permission Sync...");

  try {
    for (const perm of PERMISSIONS_REGISTRY) {
      await db.insert(permissions)
        .values({
          code: perm.code,
          name: perm.name,
        })
        .onConflictDoUpdate({
          target: permissions.code,
          set: { name: perm.name },
        });
      console.log(`Synced: ${perm.code}`);
    }

    // We do NOT aggressively delete orphaned permissions here to ensure we strictly preserve 
    // any existing dynamic role mappings or custom permissions added outside this registry.
    
    console.log(`Successfully synced ${PERMISSIONS_REGISTRY.length} permissions.`);
    process.exit(0);
  } catch (error) {
    console.error("Error syncing permissions:", error);
    process.exit(1);
  }
}

syncPermissions();
