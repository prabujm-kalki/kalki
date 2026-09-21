import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  employees,
  locationMemberships,
  locationRoleAssignments,
  organizationMemberships,
  organizationRoleAssignments,
  permissions,
  rolePermissions,
  systemAuthorities,
} from "@/db/schema";
import {
  isEmployeeOperationAuthorized,
  type AuthorizationGrants,
  type EmployeePermission,
} from "@/lib/authorization-policy";

export type AuthorizationInput = {
  userId: string;
  organizationId: string;
  locationId: string;
  permission?: string;
};

export async function loadAuthorizationGrants(userId: string) {
  const [ownerRows, organizationMembershipRows, locationMembershipRows, organizationPermissionRows, locationPermissionRows] =
    await Promise.all([
      db
        .select({ authority: systemAuthorities.authority })
        .from(systemAuthorities)
        .where(
          and(
            eq(systemAuthorities.userId, userId),
            eq(systemAuthorities.authority, "OWNER"),
          ),
        ),
      db
        .select({ organizationId: organizationMemberships.organizationId })
        .from(organizationMemberships)
        .where(
          and(
            eq(organizationMemberships.userId, userId),
            eq(organizationMemberships.isActive, true),
          ),
        ),
      db
        .select({
          organizationId: locationMemberships.organizationId,
          locationId: locationMemberships.locationId,
        })
        .from(locationMemberships)
        .where(
          and(
            eq(locationMemberships.userId, userId),
            eq(locationMemberships.isActive, true),
          ),
        ),
      db
        .select({
          organizationId: organizationRoleAssignments.organizationId,
          permission: permissions.code,
        })
        .from(organizationRoleAssignments)
        .innerJoin(
          rolePermissions,
          eq(rolePermissions.roleId, organizationRoleAssignments.roleId),
        )
        .innerJoin(
          permissions,
          eq(permissions.id, rolePermissions.permissionId),
        )
        .where(eq(organizationRoleAssignments.userId, userId)),
      db
        .select({
          organizationId: locationRoleAssignments.organizationId,
          locationId: locationRoleAssignments.locationId,
          permission: permissions.code,
        })
        .from(locationRoleAssignments)
        .innerJoin(
          rolePermissions,
          eq(rolePermissions.roleId, locationRoleAssignments.roleId),
        )
        .innerJoin(
          permissions,
          eq(permissions.id, rolePermissions.permissionId),
        )
        .where(eq(locationRoleAssignments.userId, userId)),
    ]);

  return {
    isOwner: ownerRows.length === 1,
    organizationMemberships: organizationMembershipRows.map(
      (membership) => membership.organizationId,
    ),
    locationMemberships: locationMembershipRows,
    organizationPermissions: organizationPermissionRows,
    locationPermissions: locationPermissionRows,
  } satisfies AuthorizationGrants;
}

export async function authorizeEmployeeOperation(input: AuthorizationInput) {
  const grants = await loadAuthorizationGrants(input.userId);
  return isEmployeeOperationAuthorized({ id: input.userId }, input, grants);
}

export async function requireAuthenticatedUser(request: Request) {
  const { auth } = await import("@/lib/auth");
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return null;

  const employeeRows = await db
    .select({ status: employees.status })
    .from(employees)
    .where(eq(employees.userId, session.user.id))
    .limit(1);

  if (employeeRows.length > 0) {
    if (employeeRows[0].status === "DRAFT" || employeeRows[0].status === "EXITED") {
      return null;
    }
  }

  return session.user;
}
