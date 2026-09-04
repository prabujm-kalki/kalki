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
  workInstances,
  workSituationDefinitions,
  workSituationEvidenceRequirements,
  workSituationReminderEscalationStages,
} from "@/db/schema";
import {
  assignEmployeeRole,
  createEmployeeResponsibilityAddition,
  createRoleDefinition,
  createWorkInstance,
  createWorkSituationDefinition,
  generateWorkInstance,
  getEffectiveEmployeeRole,
  getWorkInstance,
  setBusinessRoleActive,
  setRoleResponsibilityActive,
  setRoleResponsibilityWorkDefinition,
  setWorkSituationDefinitionActive,
  setWorkSituationDefinitionConfiguration,
} from "@/domains/roles-work/service";
import { employeePermissions } from "@/lib/authorization-policy";

const organizationId = randomUUID();
const otherOrganizationId = randomUUID();
const locationId = randomUUID();
const sameOrgOtherLocationId = randomUUID();
const otherOrgLocationId = randomUUID();
const authorizedUserId = `role-work-authorized-${randomUUID()}`;
const deniedUserId = `role-work-denied-${randomUUID()}`;
const authorizationRoleId = randomUUID();
const personId = randomUUID();
const employeeId = randomUUID();
const createdRoleIds: string[] = [];
const createdAssignmentIds: string[] = [];
const createdAdditionIds: string[] = [];
const createdDefinitionIds: string[] = [];
const createdInstanceIds: string[] = [];
const scope = { organizationId, locationId };
const employeeScope = { organizationId, locationId, employeeId };
const sameOrgOtherLocationScope = { organizationId, locationId: sameOrgOtherLocationId };
const otherOrgScope = { organizationId: otherOrganizationId, locationId: otherOrgLocationId };

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

async function createDefinition(title: string) {
  const definition = await createWorkSituationDefinition({ id: authorizedUserId }, {
    ...scope,
    triggerCategory: "routine",
    title,
    description: `${title} definition`,
  });
  createdDefinitionIds.push(definition.id);
  return definition;
}

beforeAll(async () => {
  await db.insert(organizations).values([
    { id: organizationId, name: "Role work expectation organization", code: `RWX-${organizationId.slice(0, 8)}` },
    { id: otherOrganizationId, name: "Other role work expectation organization", code: `RWX-${otherOrganizationId.slice(0, 8)}` },
  ]);
  await db.insert(locations).values([
    { id: locationId, organizationId, name: "Role work expectation location", code: "RWX-LOC" },
    { id: sameOrgOtherLocationId, organizationId, name: "Same org other location", code: "RWX-LOC-2" },
    { id: otherOrgLocationId, organizationId: otherOrganizationId, name: "Other org location", code: "RWX-OTHER" },
  ]);
  await db.insert(people).values({ id: personId, firstName: "Expected", displayName: "Expected Employee" });
  await db.insert(employees).values({
    id: employeeId,
    personId,
    organizationId,
    locationId,
    employeeCode: "RWX-EMP",
    employmentStartDate: "2026-09-03",
  });
  await Promise.all([insertUser(authorizedUserId), insertUser(deniedUserId)]);
  const needed = [employeePermissions.read, employeePermissions.create, employeePermissions.update];
  const existing = await db.select({ id: permissions.id, code: permissions.code }).from(permissions).where(inArray(permissions.code, needed));
  const missing = needed.filter((code) => !existing.some((permission) => permission.code === code));
  if (missing.length) {
    await db.insert(permissions).values(missing.map((code) => ({ code, name: code })));
  }
  const allPermissions = await db.select({ id: permissions.id, code: permissions.code }).from(permissions).where(inArray(permissions.code, needed));
  await db.insert(roles).values({
    id: authorizationRoleId,
    code: `RWX-ADMIN-${authorizationRoleId.slice(0, 8)}`,
    name: "Role work expectation administrator",
  });
  await db.insert(rolePermissions).values(allPermissions.map((permission) => ({ roleId: authorizationRoleId, permissionId: permission.id })));
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
  for (const instanceId of createdInstanceIds) {
    await db.delete(workInstances).where(eq(workInstances.id, instanceId));
  }
  for (const additionId of createdAdditionIds) {
    await db.delete(employeeResponsibilityAdditions).where(eq(employeeResponsibilityAdditions.id, additionId));
  }
  for (const assignmentId of createdAssignmentIds) {
    await db.delete(employeeRoleAssignments).where(eq(employeeRoleAssignments.id, assignmentId));
  }
  for (const roleId of createdRoleIds) {
    await db.delete(roleChecklistItems).where(eq(roleChecklistItems.organizationId, organizationId));
    await db.delete(roleChecklists).where(eq(roleChecklists.roleId, roleId));
    await db.delete(roleKpiDefinitions).where(eq(roleKpiDefinitions.roleId, roleId));
    await db.delete(roleResponsibilities).where(eq(roleResponsibilities.roleId, roleId));
    await db.delete(businessRoles).where(eq(businessRoles.id, roleId));
  }
  for (const definitionId of createdDefinitionIds) {
    await db.delete(workInstances).where(eq(workInstances.workSituationDefinitionId, definitionId));
    await db.delete(workSituationReminderEscalationStages).where(eq(workSituationReminderEscalationStages.workSituationDefinitionId, definitionId));
    await db.delete(workSituationEvidenceRequirements).where(eq(workSituationEvidenceRequirements.workSituationDefinitionId, definitionId));
    await db.delete(workSituationDefinitions).where(eq(workSituationDefinitions.id, definitionId));
  }
  await db.delete(locationRoleAssignments).where(eq(locationRoleAssignments.userId, authorizedUserId));
  await db.delete(rolePermissions).where(eq(rolePermissions.roleId, authorizationRoleId));
  await db.delete(roles).where(eq(roles.id, authorizationRoleId));
  await db.delete(locationMemberships).where(eq(locationMemberships.userId, authorizedUserId));
  await db.delete(organizationMemberships).where(eq(organizationMemberships.userId, authorizedUserId));
  await db.delete(organizationMemberships).where(eq(organizationMemberships.userId, deniedUserId));
  await db.delete(authUsers).where(eq(authUsers.id, deniedUserId));
  await db.delete(employees).where(eq(employees.id, employeeId));
  await db.delete(people).where(eq(people.id, personId));
  // Organization, location, and actor user rows remain as append-only audit anchors.
});

describe("Role responsibility Work/Situation expectation", () => {
  it("links active same-organization work definitions from create and later update", async () => {
    const opening = await createDefinition("Open site");
    const closing = await createDefinition("Close site");
    const role = await createRoleDefinition({ id: authorizedUserId }, {
      ...scope,
      identifier: "RWX-LINK",
      name: "Linked role",
      purpose: "Connect expected work",
      responsibilities: [
        {
          responsibility: "Open",
          actualWork: "Open the site",
          position: 10,
          workSituationDefinitionId: opening.id,
        },
        {
          responsibility: "Close",
          actualWork: "Close the site",
          position: 20,
        },
      ],
    });
    createdRoleIds.push(role!.id);
    expect(role!.responsibilities).toEqual(expect.arrayContaining([
      expect.objectContaining({ responsibility: "Open", workSituationDefinitionId: opening.id }),
      expect.objectContaining({ responsibility: "Close", workSituationDefinitionId: null }),
    ]));

    const close = role!.responsibilities.find((item) => item.responsibility === "Close")!;
    const linked = await setRoleResponsibilityWorkDefinition({ id: authorizedUserId }, {
      ...scope,
      roleId: role!.id,
      responsibilityId: close.id,
      workSituationDefinitionId: closing.id,
    });
    expect(linked.responsibilities.find((item) => item.id === close.id)?.workSituationDefinitionId).toBe(closing.id);

    const retried = await setRoleResponsibilityWorkDefinition({ id: authorizedUserId }, {
      ...scope,
      roleId: role!.id,
      responsibilityId: close.id,
      workSituationDefinitionId: closing.id,
    });
    expect(retried.responsibilities.find((item) => item.id === close.id)?.workSituationDefinitionId).toBe(closing.id);

    const cleared = await setRoleResponsibilityWorkDefinition({ id: authorizedUserId }, {
      ...scope,
      roleId: role!.id,
      responsibilityId: close.id,
      workSituationDefinitionId: null,
    });
    expect(cleared.responsibilities.find((item) => item.id === close.id)).toMatchObject({
      id: close.id,
      responsibility: "Close",
      workSituationDefinitionId: null,
      isActive: true,
    });
  });

  it("rejects invalid, inactive, unauthorized, cross-location, and cross-organization links", async () => {
    const definition = await createDefinition("Scoped work");
    const inactive = await createDefinition("Inactive work");
    await setWorkSituationDefinitionActive({ id: authorizedUserId }, {
      ...scope,
      workSituationDefinitionId: inactive.id,
      isActive: false,
    });
    const otherOrgDefinition = await createWorkSituationDefinition({ id: authorizedUserId }, {
      ...otherOrgScope,
      triggerCategory: "routine",
      title: "Other org work",
      description: "Other organization definition",
    }).catch((error) => error);
    expect(otherOrgDefinition).toMatchObject({ code: "ACCESS_DENIED" });

    const foreignDefinitionId = randomUUID();
    await db.insert(workSituationDefinitions).values({
      id: foreignDefinitionId,
      organizationId: otherOrganizationId,
      triggerCategory: "routine",
      title: "Foreign work",
      description: "Foreign definition",
    });
    createdDefinitionIds.push(foreignDefinitionId);

    const role = await createRoleDefinition({ id: authorizedUserId }, {
      ...scope,
      identifier: "RWX-REJECT",
      name: "Rejected link role",
      purpose: "Reject invalid work references",
      responsibilities: [{ responsibility: "Duty", actualWork: "Do work", position: 10 }],
    });
    createdRoleIds.push(role!.id);
    const responsibilityId = role!.responsibilities[0].id;

    await expect(createRoleDefinition({ id: authorizedUserId }, {
      ...scope,
      identifier: "RWX-INACTIVE",
      name: "Inactive definition role",
      purpose: "Reject inactive definition",
      responsibilities: [{
        responsibility: "Inactive",
        actualWork: "Cannot attach",
        position: 10,
        workSituationDefinitionId: inactive.id,
      }],
    })).rejects.toMatchObject({ code: "PREREQUISITE_NOT_SATISFIED" });

    await expect(createRoleDefinition({ id: authorizedUserId }, {
      ...scope,
      identifier: "RWX-FOREIGN",
      name: "Foreign definition role",
      purpose: "Reject foreign definition",
      responsibilities: [{
        responsibility: "Foreign",
        actualWork: "Cannot attach",
        position: 10,
        workSituationDefinitionId: foreignDefinitionId,
      }],
    })).rejects.toMatchObject({ code: "NOT_FOUND" });

    await expect(setRoleResponsibilityWorkDefinition({ id: authorizedUserId }, {
      ...scope,
      roleId: role!.id,
      responsibilityId,
      workSituationDefinitionId: "not-a-uuid",
    })).rejects.toMatchObject({ code: "INVALID_INPUT" });
    await expect(setRoleResponsibilityWorkDefinition({ id: authorizedUserId }, {
      ...scope,
      roleId: role!.id,
      responsibilityId,
      workSituationDefinitionId: inactive.id,
    })).rejects.toMatchObject({ code: "PREREQUISITE_NOT_SATISFIED" });
    await expect(setRoleResponsibilityWorkDefinition({ id: authorizedUserId }, {
      ...scope,
      roleId: role!.id,
      responsibilityId,
      workSituationDefinitionId: foreignDefinitionId,
    })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(setRoleResponsibilityWorkDefinition({ id: deniedUserId }, {
      ...scope,
      roleId: role!.id,
      responsibilityId,
      workSituationDefinitionId: definition.id,
    })).rejects.toMatchObject({ code: "ACCESS_DENIED" });
    await expect(setRoleResponsibilityWorkDefinition({ id: authorizedUserId }, {
      ...sameOrgOtherLocationScope,
      roleId: role!.id,
      responsibilityId,
      workSituationDefinitionId: definition.id,
    })).rejects.toMatchObject({ code: "ACCESS_DENIED" });
    await expect(setRoleResponsibilityWorkDefinition({ id: authorizedUserId }, {
      ...otherOrgScope,
      roleId: role!.id,
      responsibilityId,
      workSituationDefinitionId: definition.id,
    })).rejects.toMatchObject({ code: "ACCESS_DENIED" });
  });

  it("surfaces unique expected work on the effective role without generating instances", async () => {
    const shared = await createDefinition("Shared expected work");
    const extra = await createDefinition("Extra expected work");
    const hidden = await createDefinition("Hidden expected work");
    const role = await createRoleDefinition({ id: authorizedUserId }, {
      ...scope,
      identifier: "RWX-EFFECTIVE",
      name: "Effective expected work role",
      purpose: "Compose expected work",
      responsibilities: [
        { responsibility: "Shared A", actualWork: "A", position: 10, workSituationDefinitionId: shared.id },
        { responsibility: "Shared B", actualWork: "B", position: 20, workSituationDefinitionId: shared.id },
        { responsibility: "Extra", actualWork: "C", position: 30, workSituationDefinitionId: extra.id },
        { responsibility: "Hidden", actualWork: "D", position: 40, workSituationDefinitionId: hidden.id },
      ],
    });
    createdRoleIds.push(role!.id);
    const assignment = await assignEmployeeRole({ id: authorizedUserId }, { ...employeeScope, roleId: role!.id });
    createdAssignmentIds.push(assignment.id);
    const addition = await createEmployeeResponsibilityAddition({ id: authorizedUserId }, {
      ...employeeScope,
      responsibility: "Person-specific",
      actualWork: "Does not become expected work",
      position: 50,
    });
    createdAdditionIds.push(addition.id);
    const hiddenResponsibility = role!.responsibilities.find((item) => item.responsibility === "Hidden")!;
    await setRoleResponsibilityActive({ id: authorizedUserId }, {
      ...scope,
      roleId: role!.id,
      responsibilityId: hiddenResponsibility.id,
      isActive: false,
    });

    const instance = await createWorkInstance({ id: authorizedUserId }, {
      ...scope,
      workSituationDefinitionId: shared.id,
      sourceReference: `manual-${shared.id}`,
    });
    createdInstanceIds.push(instance.id);
    const snapshot = instance.definitionSnapshot;

    const effective = await getEffectiveEmployeeRole({ id: authorizedUserId }, employeeScope);
    expect(effective.expectedWorkSituationDefinitions).toEqual([
      expect.objectContaining({ id: extra.id, title: "Extra expected work", isActive: true }),
      expect.objectContaining({ id: shared.id, title: "Shared expected work", isActive: true }),
    ]);
    expect(effective.expectedWorkSituationDefinitions).toHaveLength(2);
    expect(effective.expectedWorkSituationDefinitions.map((item) => item.id)).not.toContain(hidden.id);
    expect(effective.employeeResponsibilityAdditions.map((item) => item.id)).toContain(addition.id);

    await setWorkSituationDefinitionConfiguration({ id: authorizedUserId }, {
      ...scope,
      workSituationDefinitionId: shared.id,
      evidenceRequired: true,
    });
    await setWorkSituationDefinitionActive({ id: authorizedUserId }, {
      ...scope,
      workSituationDefinitionId: extra.id,
      isActive: false,
    });
    const afterChange = await getEffectiveEmployeeRole({ id: authorizedUserId }, employeeScope);
    expect(afterChange.expectedWorkSituationDefinitions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: extra.id, isActive: false }),
      expect.objectContaining({ id: shared.id, isActive: true }),
    ]));
    const frozen = await getWorkInstance({ id: authorizedUserId }, scope, instance.id);
    expect(frozen.definitionSnapshot).toEqual(snapshot);
    expect(frozen.assignedEmployeeId).toBeNull();

    const generated = await generateWorkInstance({ id: authorizedUserId }, {
      ...scope,
      workSituationDefinitionId: shared.id,
      triggerCategory: "routine",
      sourceReference: `generated-${shared.id}`,
    });
    createdInstanceIds.push(generated.id);
    expect(generated.assignedEmployeeId).toBeNull();

    const instances = await db.select({ id: workInstances.id }).from(workInstances).where(eq(workInstances.workSituationDefinitionId, shared.id));
    expect(instances).toHaveLength(2);

    await setBusinessRoleActive({ id: authorizedUserId }, { ...scope, roleId: role!.id, isActive: false });
    const afterRoleDeactivation = await getEffectiveEmployeeRole({ id: authorizedUserId }, employeeScope);
    expect(afterRoleDeactivation.expectedWorkSituationDefinitions).toEqual([]);
    await expect(getEffectiveEmployeeRole({ id: deniedUserId }, employeeScope)).rejects.toMatchObject({
      code: "ACCESS_DENIED",
    });
    await expect(getEffectiveEmployeeRole({ id: authorizedUserId }, {
      ...employeeScope,
      locationId: sameOrgOtherLocationId,
    })).rejects.toMatchObject({ code: "ACCESS_DENIED" });
  });
});
