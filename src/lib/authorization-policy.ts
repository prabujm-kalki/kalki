export const employeePermissions = {
  read: "employee:read",
  create: "employee:create",
  update: "employee:update",
} as const;

export type EmployeePermission =
  (typeof employeePermissions)[keyof typeof employeePermissions];

export type AuthorizationInput = {
  organizationId: string;
  locationId: string;
  permission: EmployeePermission;
};

export type AuthorizationGrants = {
  isOwner: boolean;
  organizationMemberships: string[];
  locationMemberships: Array<{ organizationId: string; locationId: string }>;
  organizationPermissions: Array<{
    organizationId: string;
    permission: string;
  }>;
  locationPermissions: Array<{
    organizationId: string;
    locationId: string;
    permission: string;
  }>;
};

export function isEmployeeOperationAuthorized(
  user: { id: string } | null,
  input: AuthorizationInput,
  grants: AuthorizationGrants,
) {
  if (!user) return false;
  if (grants.isOwner) return true;

  const organizationMember = grants.organizationMemberships.includes(
    input.organizationId,
  );
  const locationMember = grants.locationMemberships.some(
    (membership) =>
      membership.organizationId === input.organizationId &&
      membership.locationId === input.locationId,
  );
  if (!organizationMember || !locationMember) return false;

  return (
    grants.organizationPermissions.some(
      (grant) =>
        grant.organizationId === input.organizationId &&
        grant.permission === input.permission,
    ) ||
    grants.locationPermissions.some(
      (grant) =>
        grant.organizationId === input.organizationId &&
        grant.locationId === input.locationId &&
        grant.permission === input.permission,
    )
  );
}
