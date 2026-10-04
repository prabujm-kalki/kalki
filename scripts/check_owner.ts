import { db } from "@/db";
import { employeeRoleAssignments, locationRoleAssignments, organizationRoleAssignments, authUsers, businessRoles, employees } from "@/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  const roleId = "854acd53-19bc-437d-b758-31d369d96f3a";

  const eAssignments = await db.select().from(employeeRoleAssignments).where(eq(employeeRoleAssignments.roleId, roleId));
  const lAssignments = await db.select().from(locationRoleAssignments).where(eq(locationRoleAssignments.roleId, roleId));
  const oAssignments = await db.select().from(organizationRoleAssignments).where(eq(organizationRoleAssignments.roleId, roleId));

  console.log("Employee Role Assignments:", eAssignments);
  console.log("Location Role Assignments:", lAssignments);
  console.log("Organization Role Assignments:", oAssignments);
}
main().catch(console.error).then(() => process.exit(0));
