import "dotenv/config";
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import {
  authUsers,
  locationMemberships,
  locationRoleAssignments,
  locations,
  organizationMemberships,
  organizations,
  permissions,
  rolePermissions,
  roles,
} from "@/db/schema";
import { GET as getSessionContextRoute } from "@/app/api/session-context/route";
import { GET as getWorkInstancesRoute } from "@/app/api/work-instances/route";
import { getSessionContext, SessionServiceError } from "@/domains/session/service";
import { employeePermissions } from "@/lib/authorization-policy";

const organizationId = randomUUID();
const otherOrganizationId = randomUUID();
const locationId = randomUUID();
const sameOrgOtherLocationId = randomUUID();
const otherOrgLocationId = randomUUID();
const authorizedUserId = `session-authorized-${randomUUID()}`;
const membershipOnlyUserId = `session-member-${randomUUID()}`;
const deniedUserId = `session-denied-${randomUUID()}`;
const authorizationRoleId = randomUUID();

async function insertUser(id: string) {
  await db.insert(authUsers).values({
    id,
    name: id,
    email: `${id}@example.invalid`,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

beforeAll(async () => {
  await db.insert(organizations).values([
    { id: organizationId, name: "Session organization", code: `SC-${organizationId.slice(0, 8)}` },
    { id: otherOrganizationId, name: "Other session organization", code: `SC-${otherOrganizationId.slice(0, 8)}` },
  ]);
  await db.insert(locations).values([
    { id: locationId, organizationId, name: "Session location", code: "SC-LOC" },
    { id: sameOrgOtherLocationId, organizationId, name: "Same org other location", code: "SC-LOC-2" },
    { id: otherOrgLocationId, organizationId: otherOrganizationId, name: "Other org location", code: "SC-OTHER" },
  ]);
  await Promise.all([insertUser(authorizedUserId), insertUser(membershipOnlyUserId), insertUser(deniedUserId)]);
  const needed = [employeePermissions.read, employeePermissions.create, employeePermissions.update];
  const existing = await db.select({ id: permissions.id, code: permissions.code }).from(permissions).where(inArray(permissions.code, needed));
  const missing = needed.filter((code) => !existing.some((permission) => permission.code === code));
  if (missing.length) {
    await db.insert(permissions).values(missing.map((code) => ({ code, name: code })));
  }
  const allPermissions = await db.select({ id: permissions.id, code: permissions.code }).from(permissions).where(inArray(permissions.code, needed));
  await db.insert(roles).values({
    id: authorizationRoleId,
    code: `SC-ADMIN-${authorizationRoleId.slice(0, 8)}`,
    name: "Session administrator",
  });
  await db.insert(rolePermissions).values(allPermissions.map((permission) => ({ roleId: authorizationRoleId, permissionId: permission.id })));
  await db.insert(organizationMemberships).values([
    { userId: authorizedUserId, organizationId },
    { userId: membershipOnlyUserId, organizationId },
    { userId: deniedUserId, organizationId },
  ]);
  await db.insert(locationMemberships).values([
    { userId: authorizedUserId, organizationId, locationId },
    { userId: membershipOnlyUserId, organizationId, locationId },
  ]);
  await db.insert(locationRoleAssignments).values({
    userId: authorizedUserId,
    organizationId,
    locationId,
    roleId: authorizationRoleId,
  });
});

afterAll(async () => {
  await db.delete(locationRoleAssignments).where(eq(locationRoleAssignments.userId, authorizedUserId));
  await db.delete(rolePermissions).where(eq(rolePermissions.roleId, authorizationRoleId));
  await db.delete(roles).where(eq(roles.id, authorizationRoleId));
  await db.delete(locationMemberships).where(eq(locationMemberships.userId, authorizedUserId));
  await db.delete(locationMemberships).where(eq(locationMemberships.userId, membershipOnlyUserId));
  await db.delete(organizationMemberships).where(eq(organizationMemberships.userId, authorizedUserId));
  await db.delete(organizationMemberships).where(eq(organizationMemberships.userId, membershipOnlyUserId));
  await db.delete(organizationMemberships).where(eq(organizationMemberships.userId, deniedUserId));
  await db.delete(authUsers).where(eq(authUsers.id, authorizedUserId));
  await db.delete(authUsers).where(eq(authUsers.id, membershipOnlyUserId));
  await db.delete(authUsers).where(eq(authUsers.id, deniedUserId));
  await db.delete(locations).where(eq(locations.id, locationId));
  await db.delete(locations).where(eq(locations.id, sameOrgOtherLocationId));
  await db.delete(locations).where(eq(locations.id, otherOrgLocationId));
  await db.delete(organizations).where(eq(organizations.id, organizationId));
  await db.delete(organizations).where(eq(organizations.id, otherOrganizationId));
});

describe("Session context for operational UI", () => {
  it("requires authentication", async () => {
    await expect(getSessionContext(null)).rejects.toMatchObject({ code: "AUTHENTICATION_REQUIRED" });
    expect(new SessionServiceError("Authentication required", "AUTHENTICATION_REQUIRED")).toBeInstanceOf(SessionServiceError);
    const sessionResponse = await getSessionContextRoute(new Request("http://localhost/api/session-context"));
    expect(sessionResponse.status).toBe(401);
    const workResponse = await getWorkInstancesRoute(new Request("http://localhost/api/work-instances?organizationId=" + organizationId + "&locationId=" + locationId));
    expect(workResponse.status).toBe(401);
  });

  it("returns only authorized location scopes and omits other organizations", async () => {
    const session = await getSessionContext({ id: authorizedUserId, email: `${authorizedUserId}@example.invalid` });
    expect(session.user.id).toBe(authorizedUserId);
    expect(session.scopes).toEqual([expect.objectContaining({
      organizationId,
      locationId,
      organizationName: "Session organization",
      locationName: "Session location",
      permissions: expect.arrayContaining([employeePermissions.read, employeePermissions.create, employeePermissions.update]),
    })]);
    expect(session.scopes.map((scope) => scope.locationId)).not.toContain(sameOrgOtherLocationId);
    expect(session.scopes.map((scope) => scope.organizationId)).not.toContain(otherOrganizationId);
  });

  it("hides locations without employee:read and users without location membership", async () => {
    const memberOnly = await getSessionContext({ id: membershipOnlyUserId });
    expect(memberOnly.scopes).toEqual([]);
    const denied = await getSessionContext({ id: deniedUserId });
    expect(denied.scopes).toEqual([]);
  });
});
