import { db } from '../src/db/index.js';
import { roles, rolePermissions, permissions, users, employees } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';

async function check() {
  const allRoles = await db.select().from(roles).where(eq(roles.name, 'Executive Director'));
  if (allRoles.length === 0) {
    console.log("No Executive Director role found.");
    process.exit(0);
  }
  const role = allRoles[0];
  console.log("Role:", role.name, role.id);
  
  const perms = await db.select({
    code: permissions.code
  })
  .from(rolePermissions)
  .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
  .where(eq(rolePermissions.roleId, role.id));
  
  console.log("Permissions for Executive Director:");
  perms.filter(p => p.code.startsWith('sales.')).forEach(p => console.log(p.code));
  process.exit(0);
}
check();
