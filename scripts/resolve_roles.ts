import "dotenv/config";
import { db } from "../src/db";
import { roles, businessRoles, organizations, employeeRoleAssignments, rolePermissions, organizationRoleAssignments } from "../src/db/schema";
import { eq, and } from "drizzle-orm";

async function resolveRoles() {
  console.log("Starting roles resolution...");

  try {
    const orgs = await db.select().from(organizations).limit(1);
    const orgId = orgs[0].id;

    const allRoles = await db.select().from(roles);
    let resolved = 0;

    for (const role of allRoles) {
      const existingBusinessRoleById = await db.select().from(businessRoles).where(eq(businessRoles.id, role.id));
      
      if (existingBusinessRoleById.length === 0) {
        // Try to find by name
        const existingByName = await db.select().from(businessRoles)
          .where(and(eq(businessRoles.name, role.name), eq(businessRoles.organizationId, orgId)));
          
        if (existingByName.length > 0) {
          console.log(`Found collision for ${role.name}. Resolving by updating roles to use businessRoles.id...`);
          const br = existingByName[0];
          
          if (br.id !== role.id) {
            await db.transaction(async (tx) => {
              // Rename old role code to avoid unique constraint error
              await tx.update(roles).set({ code: role.code + "_old_" + Math.floor(Math.random() * 1000) }).where(eq(roles.id, role.id));
              
              // Insert new role with businessRoles ID
              await tx.insert(roles).values({
                id: br.id,
                name: role.name,
                code: role.code,
                description: role.description
              });
              
              // Copy permissions
              const perms = await tx.select().from(rolePermissions).where(eq(rolePermissions.roleId, role.id));
              for (const p of perms) {
                await tx.insert(rolePermissions).values({
                  roleId: br.id,
                  permissionId: p.permissionId
                });
              }
              
              // Update org assignments
              await tx.update(organizationRoleAssignments).set({ roleId: br.id }).where(eq(organizationRoleAssignments.roleId, role.id));
              
              // Delete old role
              await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, role.id));
              await tx.delete(roles).where(eq(roles.id, role.id));
            });
            resolved++;
          }
        } else {
          console.log(`Backfilling missing businessRole for: ${role.name}`);
          await db.insert(businessRoles).values({
            id: role.id,
            organizationId: orgId,
            name: role.name,
            identifier: role.code,
            purpose: `Unified application role for ${role.name}`,
            isActive: true,
          });
          resolved++;
        }
      }
    }

    console.log(`\nResolution complete! Successfully synced ${resolved} legacy roles.`);
    process.exit(0);
  } catch (error) {
    console.error("Error during resolution:", error);
    process.exit(1);
  }
}

resolveRoles();
