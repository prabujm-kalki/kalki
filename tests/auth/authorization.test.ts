import { describe, expect, it } from "vitest";
import {
  employeePermissions,
  isEmployeeOperationAuthorized,
  type AuthorizationGrants,
} from "../../src/lib/authorization-policy";

const scope = {
  organizationId: "00000000-0000-0000-0000-000000000001",
  locationId: "00000000-0000-0000-0000-000000000011",
};

const grants: AuthorizationGrants = {
  isOwner: false,
  organizationMemberships: [scope.organizationId],
  locationMemberships: [scope],
  organizationPermissions: [],
  locationPermissions: [
    { ...scope, permission: employeePermissions.read },
  ],
};

describe("Employee authorization policy", () => {
  it("denies unauthenticated access", () => {
    expect(
      isEmployeeOperationAuthorized(null, {
        ...scope,
        permission: employeePermissions.read,
      }, grants),
    ).toBe(false);
  });

  it("allows an authenticated user with matching scope and permission", () => {
    expect(
      isEmployeeOperationAuthorized(
        { id: "user-1" },
        { ...scope, permission: employeePermissions.read },
        grants,
      ),
    ).toBe(true);
  });

  it("denies a user whose membership belongs to another organization", () => {
    expect(
      isEmployeeOperationAuthorized(
        { id: "user-1" },
        {
          organizationId: "00000000-0000-0000-0000-000000000002",
          locationId: scope.locationId,
          permission: employeePermissions.read,
        },
        grants,
      ),
    ).toBe(false);
  });

  it("denies a user without the requested permission", () => {
    expect(
      isEmployeeOperationAuthorized(
        { id: "user-1" },
        { ...scope, permission: employeePermissions.update },
        grants,
      ),
    ).toBe(false);
  });

  it("allows the designated Owner through the same policy boundary", () => {
    expect(
      isEmployeeOperationAuthorized(
        { id: "owner-1" },
        {
          organizationId: "00000000-0000-0000-0000-000000000002",
          locationId: "00000000-0000-0000-0000-000000000022",
          permission: employeePermissions.update,
        },
        { ...grants, isOwner: true },
      ),
    ).toBe(true);
  });
});
