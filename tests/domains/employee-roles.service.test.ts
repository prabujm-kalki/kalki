import "dotenv/config";
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import {
  authUsers,
  businessRoles,
  employeeResponsibilityAdditions,
  employeeRoleAssignments,
  employees,
  locationMemberships,
  locationRoleAssignments,
  locations,
  organizationMemberships,
  organizations,
  people,
  permissions,
  roleChecklistItems,
  roleChecklists,
  roleKpiDefinitions,
  rolePermissions,
  roleResponsibilities,
  roles,
} from "@/db/schema";
import {
  assignEmployeeRole,
  createEmployeeResponsibilityAddition,
  createRoleDefinition,
  getEffectiveEmployeeRole,
  getEmployeeResponsibilityAddition,
  getEmployeeRoleAssignment,
  getRoleDefinition,
  listEmployeeResponsibilityAdditions,
  listEmployeeRoleAssignments,
  RolesWorkServiceError,
} from "@/domains/roles-work/service";
import { employeePermissions } from "@/lib/authorization-policy";

const organizationId = randomUUID();
const otherOrganizationId = randomUUID();
const locationId = randomUUID();
const otherOrgLocationId = randomUUID();
const sameOrgOtherLocationId = randomUUID();
const authorizedUserId = `employee-roles-authorized-${randomUUID()}`;
const deniedUserId = `employee-roles-denied-${randomUUID()}`;
const authorizationRoleId = randomUUID();
const personId = randomUUID();
const otherOrgPersonId = randomUUID();
const employeeId = randomUUID();
const otherOrgEmployeeId = randomUUID();
const createdPermissionIds: string[] = [];
const createdRoleIds: string[] = [];
const createdAssignmentIds: string[] = [];
const createdAdditionIds: string[] = [];
const scope = { organizationId, locationId, employeeId };
const otherScope = {
  organizationId: otherOrganizationId,
  locationId: otherOrgLocationId,
  employeeId: otherOrgEmployeeId,
};

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
    { id: organizationId, name: "Employee roles organization", code: `ER-${organizationId.slice(0, 8)}` },
    { id: otherOrganizationId, name: "Other employee roles organization", code: `ER-${otherOrganizationId.slice(0, 8)}` },
  ]);
  await db.insert(locations).values([
    { id: locationId, organizationId, name: "Employee roles location", code: "ER-LOC" },
    { id: sameOrgOtherLocationId, organizationId, name: "Same org other location", code: "ER-LOC-2" },
    { id: otherOrgLocationId, organizationId: otherOrganizationId, name: "Other org location", code: "ER-OTHER" },
  ]);
  await db.insert(people).values([
    { id: personId, firstName: "Assigned", displayName: "Assigned Employee" },
    { id: otherOrgPersonId, firstName: "Other", displayName: "Other Employee" },
  ]);
  await db.insert(employees).values([
    {
      id: employeeId,
      personId,
      organizationId,
      locationId,
      employeeCode: "ER-EMP",
      employmentStartDate: "2026-09-03",
    },
    {
      id: otherOrgEmployeeId,
      personId: otherOrgPersonId,
      organizationId: otherOrganizationId,
      locationId: otherOrgLocationId,
      employeeCode: "ER-OTHER",
      employmentStartDate: "2026-09-03",
    },
  ]);
  await Promise.all([insertUser(authorizedUserId), insertUser(deniedUserId)]);
  const existing = await db
    .select({ id: permissions.id, code: permissions.code })
    .from(permissions)
    .where(inArray(permissions.code, [employeePermissions.read, employeePermissions.create]));
  const missing = [employeePermissions.read, employeePermissions.create].filter(
    (code) => !existing.some((permission) => permission.code === code),
  );
  if (missing.length) {
    const created = await db
      .insert(permissions)
      .values(missing.map((code) => ({ code, name: code })))
      .returning({ id: permissions.id });
    createdPermissionIds.push(...created.map((permission) => permission.id));
  }
  const allPermissions = await db
    .select({ id: permissions.id, code: permissions.code })
    .from(permissions)
    .where(inArray(permissions.code, [employeePermissions.read, employeePermissions.create]));
  await db.insert(roles).values({
    id: authorizationRoleId,
    code: `ER-ADMIN-${authorizationRoleId.slice(0, 8)}`,
    name: "Employee roles administrator",
  });
  await db.insert(rolePermissions).values(
    allPermissions.map((permission) => ({ roleId: authorizationRoleId, permissionId: permission.id })),
  );
  await db.insert(organizationMemberships).values([
    { userId: authorizedUserId, organizationId },
    { userId: deniedUserId, organizationId },
  ]);
  await db.insert(locationMemberships).values({ userId: authorizedUserId, organizationId, locationId });
  await db.insert(locationRoleAssignments).values({
    userId: authorizedUserId,
    organizationId,
    locationId,
    roleId: authorizationRoleId,
  });
});

afterAll(async () => {
  for (const additionId of createdAdditionIds) {
    await db.delete(employeeResponsibilityAdditions).where(eq(employeeResponsibilityAdditions.id, additionId));
  }
  for (const assignmentId of createdAssignmentIds) {
    await db.delete(employeeRoleAssignments).where(eq(employeeRoleAssignments.id, assignmentId));
  }
  for (const roleId of createdRoleIds) {
    await db.delete(employeeRoleAssignments).where(eq(employeeRoleAssignments.roleId, roleId));
    await db.delete(employeeResponsibilityAdditions).where(eq(employeeResponsibilityAdditions.employeeId, employeeId));
    await db.delete(roleChecklistItems).where(eq(roleChecklistItems.organizationId, organizationId));
    await db.delete(roleChecklists).where(eq(roleChecklists.roleId, roleId));
    await db.delete(roleKpiDefinitions).where(eq(roleKpiDefinitions.roleId, roleId));
    await db.delete(roleResponsibilities).where(eq(roleResponsibilities.roleId, roleId));
    await db.delete(businessRoles).where(eq(businessRoles.id, roleId));
  }
  await db.delete(locationRoleAssignments).where(eq(locationRoleAssignments.userId, authorizedUserId));
  await db.delete(rolePermissions).where(eq(rolePermissions.roleId, authorizationRoleId));
  await db.delete(roles).where(eq(roles.id, authorizationRoleId));
  for (const permissionId of createdPermissionIds) {
    await db.delete(permissions).where(eq(permissions.id, permissionId));
  }
  await db.delete(locationMemberships).where(eq(locationMemberships.userId, authorizedUserId));
  await db.delete(organizationMemberships).where(eq(organizationMemberships.userId, authorizedUserId));
  await db.delete(organizationMemberships).where(eq(organizationMemberships.userId, deniedUserId));
  await db.delete(employees).where(eq(employees.id, employeeId));
  await db.delete(employees).where(eq(employees.id, otherOrgEmployeeId));
  await db.delete(people).where(eq(people.id, personId));
  await db.delete(people).where(eq(people.id, otherOrgPersonId));
  await db.delete(authUsers).where(eq(authUsers.id, authorizedUserId));
  await db.delete(authUsers).where(eq(authUsers.id, deniedUserId));
  await db.delete(locations).where(eq(locations.id, locationId));
  await db.delete(locations).where(eq(locations.id, sameOrgOtherLocationId));
  await db.delete(locations).where(eq(locations.id, otherOrgLocationId));
  await db.delete(organizations).where(eq(organizations.id, organizationId));
  await db.delete(organizations).where(eq(organizations.id, otherOrganizationId));
});

describe("Employee business-role assignment and additions", () => {
  it("rejects unauthenticated assignment and addition writes", async () => {
    await expect(assignEmployeeRole(null, { ...scope, roleId: randomUUID() })).rejects.toBeInstanceOf(
      RolesWorkServiceError,
    );
    await expect(
      createEmployeeResponsibilityAddition(null, {
        ...scope,
        responsibility: "Extra",
        actualWork: "Do extra work",
        position: 10,
      }),
    ).rejects.toMatchObject({ code: "AUTHENTICATION_REQUIRED" });
  });

  it("assigns and retrieves multiple organization-scoped business roles for one employee", async () => {
    const firstRole = await createRoleDefinition({ id: authorizedUserId }, {
      organizationId,
      locationId,
      identifier: "OPS",
      name: "Operations",
      purpose: "Coordinate operations",
      responsibilities: [{ responsibility: "Own opening", actualWork: "Prepare site", position: 10 }],
      kpis: [{ name: "Quality", description: "Quality definition" }],
      checklists: [{ name: "Opening", items: [{ definition: "Review readiness", position: 10 }] }],
    });
    const secondRole = await createRoleDefinition({ id: authorizedUserId }, {
      organizationId,
      locationId,
      identifier: "SHIFT",
      name: "Shift lead",
      purpose: "Lead the shift",
      responsibilities: [{ responsibility: "Close shift", actualWork: "Reconcile close", position: 10 }],
    });
    expect(firstRole).not.toBeNull();
    expect(secondRole).not.toBeNull();
    createdRoleIds.push(firstRole!.id, secondRole!.id);

    const firstAssignment = await assignEmployeeRole(
      { id: authorizedUserId },
      { ...scope, roleId: firstRole!.id },
    );
    const secondAssignment = await assignEmployeeRole(
      { id: authorizedUserId },
      { ...scope, roleId: secondRole!.id },
    );
    createdAssignmentIds.push(firstAssignment.id, secondAssignment.id);

    const listed = await listEmployeeRoleAssignments({ id: authorizedUserId }, scope);
    expect(listed.map((assignment) => assignment.roleId).sort()).toEqual(
      [firstRole!.id, secondRole!.id].sort(),
    );
    await expect(
      getEmployeeRoleAssignment({ id: authorizedUserId }, scope, firstAssignment.id),
    ).resolves.toMatchObject({ employeeId, roleId: firstRole!.id, organizationId });
    await expect(
      assignEmployeeRole({ id: authorizedUserId }, { ...scope, roleId: firstRole!.id }),
    ).rejects.toMatchObject({ code: "DUPLICATE_RECORD" });
  });

  it("enforces authentication-adjacent authorization and organization isolation", async () => {
    const role = await createRoleDefinition({ id: authorizedUserId }, {
      organizationId,
      locationId,
      identifier: "ISO",
      name: "Isolation",
      purpose: "Isolation role",
    });
    createdRoleIds.push(role!.id);
    await expect(
      assignEmployeeRole({ id: deniedUserId }, { ...scope, roleId: role!.id }),
    ).rejects.toMatchObject({ code: "ACCESS_DENIED" });
    await expect(listEmployeeRoleAssignments({ id: deniedUserId }, scope)).rejects.toMatchObject({
      code: "ACCESS_DENIED",
    });
    await expect(
      assignEmployeeRole({ id: authorizedUserId }, { ...otherScope, roleId: role!.id }),
    ).rejects.toMatchObject({ code: "ACCESS_DENIED" });
    await expect(
      assignEmployeeRole(
        { id: authorizedUserId },
        { organizationId, locationId: sameOrgOtherLocationId, employeeId, roleId: role!.id },
      ),
    ).rejects.toMatchObject({ code: "ACCESS_DENIED" });
    await expect(
      getEffectiveEmployeeRole(
        { id: authorizedUserId },
        { organizationId: otherOrganizationId, locationId: otherOrgLocationId, employeeId },
      ),
    ).rejects.toMatchObject({ code: "ACCESS_DENIED" });
  });

  it("creates and reads employee-specific additions without mutating the shared role baseline", async () => {
    const role = await createRoleDefinition({ id: authorizedUserId }, {
      organizationId,
      locationId,
      identifier: "BASE",
      name: "Baseline",
      purpose: "Shared baseline",
      responsibilities: [{ responsibility: "Standard duty", actualWork: "Do standard work", position: 10 }],
      kpis: [{ name: "Throughput", description: "Definition only" }],
      checklists: [{ name: "Close", items: [{ definition: "Lock doors", position: 10 }] }],
    });
    createdRoleIds.push(role!.id);
    const assignment = await assignEmployeeRole({ id: authorizedUserId }, { ...scope, roleId: role!.id });
    createdAssignmentIds.push(assignment.id);

    const baselineBefore = await getRoleDefinition(
      { id: authorizedUserId },
      { organizationId, locationId },
      role!.id,
    );
    const addition = await createEmployeeResponsibilityAddition({ id: authorizedUserId }, {
      ...scope,
      responsibility: "Employee-only duty",
      actualWork: "Do additional work",
      position: 20,
    });
    createdAdditionIds.push(addition.id);
    await expect(
      createEmployeeResponsibilityAddition({ id: authorizedUserId }, {
        ...scope,
        responsibility: "Duplicate position",
        actualWork: "Should fail",
        position: 20,
      }),
    ).rejects.toMatchObject({ code: "DUPLICATE_RECORD" });

    const listedAdditions = await listEmployeeResponsibilityAdditions({ id: authorizedUserId }, scope);
    expect(listedAdditions).toEqual(expect.arrayContaining([expect.objectContaining({ id: addition.id })]));
    await expect(
      getEmployeeResponsibilityAddition({ id: authorizedUserId }, scope, addition.id),
    ).resolves.toMatchObject({ responsibility: "Employee-only duty", employeeId });

    const baselineAfter = await getRoleDefinition(
      { id: authorizedUserId },
      { organizationId, locationId },
      role!.id,
    );
    expect(baselineAfter).toMatchObject({
      id: baselineBefore.id,
      identifier: baselineBefore.identifier,
      purpose: baselineBefore.purpose,
      responsibilities: baselineBefore.responsibilities,
      kpis: baselineBefore.kpis,
      checklists: baselineBefore.checklists,
    });
    expect(baselineAfter.responsibilities).toHaveLength(1);
    expect(baselineAfter.responsibilities[0].responsibility).toBe("Standard duty");
  });

  it("composes a read-only effective role from assigned baselines and employee additions", async () => {
    const role = await createRoleDefinition({ id: authorizedUserId }, {
      organizationId,
      locationId,
      identifier: "VIEW",
      name: "Effective view",
      purpose: "Show effective role",
      responsibilities: [{ responsibility: "Baseline duty", actualWork: "Baseline work", position: 10 }],
      kpis: [{ name: "Accuracy", description: "Accuracy definition" }],
      checklists: [{ name: "Prep", items: [{ definition: "Prep station", position: 10 }] }],
    });
    createdRoleIds.push(role!.id);
    const assignment = await assignEmployeeRole({ id: authorizedUserId }, { ...scope, roleId: role!.id });
    createdAssignmentIds.push(assignment.id);
    const addition = await createEmployeeResponsibilityAddition({ id: authorizedUserId }, {
      ...scope,
      responsibility: "View addition",
      actualWork: "Additional view work",
      position: 30,
    });
    createdAdditionIds.push(addition.id);

    const effective = await getEffectiveEmployeeRole({ id: authorizedUserId }, scope);
    expect(effective.employeeId).toBe(employeeId);
    expect(effective.assignments.map((item) => item.roleId)).toContain(role!.id);
    const assigned = effective.assignedRoles.find((item) => item.id === role!.id);
    expect(assigned).toMatchObject({
      identifier: "VIEW",
      purpose: "Show effective role",
      responsibilities: [{ responsibility: "Baseline duty", position: 10 }],
      kpis: [{ name: "Accuracy" }],
      checklists: [{ name: "Prep", items: [{ definition: "Prep station" }] }],
    });
    expect(effective.employeeResponsibilityAdditions).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: addition.id, responsibility: "View addition" })]),
    );
    expect(assigned?.responsibilities.some((item) => item.responsibility === "View addition")).toBe(false);
    await expect(getEffectiveEmployeeRole({ id: deniedUserId }, scope)).rejects.toMatchObject({
      code: "ACCESS_DENIED",
    });
  });
});
