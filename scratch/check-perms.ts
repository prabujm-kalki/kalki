import { db } from "../src/db";
import { authUsers, organizationRoleAssignments, rolePermissions, permissions } from "../src/db/schema";
import { eq, ilike } from "drizzle-orm";

async function run() {
  const users = await db.select().from(authUsers).where(ilike(authUsers.name, "%prabha%"));
  if (users.length === 0) return console.log("No prabha");
  const userId = users[0].id;
  
  const perms = await db.select({ code: permissions.code })
    .from(organizationRoleAssignments)
    .innerJoin(rolePermissions, eq(rolePermissions.roleId, organizationRoleAssignments.roleId))
    .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
    .where(eq(organizationRoleAssignments.userId, userId));
    
  console.log("Prabha Permissions:", perms.map(p => p.code));
  process.exit(0);
}
run();
