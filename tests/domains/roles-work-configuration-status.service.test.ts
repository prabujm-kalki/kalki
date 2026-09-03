import "dotenv/config";
import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
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
  getEffectiveEmployeeRole,
  getEmployeeResponsibilityAddition,
  getEmployeeRoleAssignment,
  getRoleDefinition,
  getWorkInstance,
  getWorkSituationDefinitionForScope,
  RolesWorkServiceError,
  setBusinessRoleActive,
  setEmployeeResponsibilityAdditionActive,
  setWorkSituationDefinitionActive,
  setWorkSituationReminderEscalationStageActive,
  transitionWorkInstance,
} from "@/domains/roles-work/service";
import { employeePermissions } from "@/lib/authorization-policy";

const organizationId = randomUUID();
const otherOrganizationId = randomUUID();
const locationId = randomUUID();
const otherOrgLocationId = randomUUID();
const authorizedUserId = `cfg-status-authorized-${randomUUID()}`;
const deniedUserId = `cfg-status-denied-${randomUUID()}`;
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

beforeAll(async () => {
  await db.insert(organizations).values([
    { id: organizationId, name: "Configuration status organization", code: `CS-${organizationId.slice(0, 8)}` },
    { id: otherOrganizationId, name: "Other configuration status organization", code: `CS-${otherOrganizationId.slice(0, 8)}` },
  ]);
  await db.insert(locations).values([
    { id: locationId, organizationId, name: "Configuration status location", code: "CS-LOC" },
    { id: otherOrgLocationId, organizationId: otherOrganizationId, name: "Other org location", code: "CS-OTHER" },
  ]);
  await db.insert(people).values({ id: personId, firstName: "Status", displayName: "Status Employee" });
  await db.insert(employees).values({
    id: employeeId,
    personId,
    organizationId,
    locationId,
    employeeCode: "CS-EMP",
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
    code: `CS-ADMIN-${authorizationRoleId.slice(0, 8)}`,
    name: "Configuration status administrator",
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
  for (const definitionId of createdDefinitionIds) {
    await db.delete(workInstances).where(eq(workInstances.workSituationDefinitionId, definitionId));
    await db.delete(workSituationReminderEscalationStages).where(eq(workSituationReminderEscalationStages.workSituationDefinitionId, definitionId));
    await db.delete(workSituationEvidenceRequirements).where(eq(workSituationEvidenceRequirements.workSituationDefinitionId, definitionId));
    await db.delete(workSituationDefinitions).where(eq(workSituationDefinitions.id, definitionId));
  }
  for (const additionId of createdAdditionIds) {
    await db.delete(employeeResponsibilityAdditions).where(eq(employeeResponsibilityAdditions.id, additionId));
  }
  for (const assignmentId of createdAssignmentIds) {
    await db.delete(employeeRoleAssignments).where(eq(employeeRoleAssignments.id, assignmentId));
  }
  for (const roleId of createdRoleIds) {
    await db.delete(employeeRoleAssignments).where(eq(employeeRoleAssignments.roleId, roleId));
    await db.delete(roleChecklistItems).where(eq(roleChecklistItems.organizationId, organizationId));
    await db.delete(roleChecklists).where(eq(roleChecklists.roleId, roleId));
    await db.delete(roleKpiDefinitions).where(eq(roleKpiDefinitions.roleId, roleId));
    await db.delete(roleResponsibilities).where(eq(roleResponsibilities.roleId, roleId));
    await db.delete(businessRoles).where(eq(businessRoles.id, roleId));
  }
  await db.delete(locationRoleAssignments).where(eq(locationRoleAssignments.userId, authorizedUserId));
  await db.delete(rolePermissions).where(eq(rolePermissions.roleId, authorizationRoleId));
  await db.delete(roles).where(eq(roles.id, authorizationRoleId));
  await db.delete(locationMemberships).where(eq(locationMemberships.userId, authorizedUserId));
  await db.delete(organizationMemberships).where(eq(organizationMemberships.userId, authorizedUserId));
  await db.delete(organizationMemberships).where(eq(organizationMemberships.userId, deniedUserId));
  await db.delete(employees).where(eq(employees.id, employeeId));
  await db.delete(people).where(eq(people.id, personId));
  await db.delete(authUsers).where(eq(authUsers.id, authorizedUserId));
  await db.delete(authUsers).where(eq(authUsers.id, deniedUserId));
  await db.delete(locations).where(eq(locations.id, locationId));
  await db.delete(locations).where(eq(locations.id, otherOrgLocationId));
  await db.delete(organizations).where(eq(organizations.id, organizationId));
  await db.delete(organizations).where(eq(organizations.id, otherOrganizationId));
});

describe("Role and Work/Situation configuration status lifecycle", () => {
  it("rejects unauthenticated configuration status updates", async () => {
    await expect(setBusinessRoleActive(null, { ...scope, roleId: randomUUID(), isActive: false })).rejects.toBeInstanceOf(RolesWorkServiceError);
    await expect(setWorkSituationDefinitionActive(null, { ...scope, workSituationDefinitionId: randomUUID(), isActive: false })).rejects.toMatchObject({ code: "AUTHENTICATION_REQUIRED" });
  });

  it("updates role and addition active status without rewriting baselines, assignments, or snapshots of existing work", async () => {
    const role = await createRoleDefinition({ id: authorizedUserId }, {
      ...scope,
      identifier: "CFG-ROLE",
      name: "Configuration role",
      purpose: "Active configuration lifecycle",
      responsibilities: [
        { responsibility: "Active duty", actualWork: "Active work", position: 10 },
        { responsibility: "Inactive duty", actualWork: "Inactive work", position: 20 },
      ],
      kpis: [{ name: "Quality", description: "Quality definition" }],
      checklists: [{ name: "Prep", items: [{ definition: "Prep station", position: 10 }, { definition: "Skip later", position: 20 }] }],
    });
    createdRoleIds.push(role!.id);
    const assignment = await assignEmployeeRole({ id: authorizedUserId }, { ...employeeScope, roleId: role!.id });
    createdAssignmentIds.push(assignment.id);
    const activeAddition = await createEmployeeResponsibilityAddition({ id: authorizedUserId }, {
      ...employeeScope,
      responsibility: "Keep addition",
      actualWork: "Keep additional work",
      position: 60,
    });
    const inactiveAddition = await createEmployeeResponsibilityAddition({ id: authorizedUserId }, {
      ...employeeScope,
      responsibility: "Hide addition",
      actualWork: "Hide additional work",
      position: 70,
    });
    createdAdditionIds.push(activeAddition.id, inactiveAddition.id);

    await db.update(roleResponsibilities).set({ isActive: false }).where(and(
      eq(roleResponsibilities.roleId, role!.id),
      eq(roleResponsibilities.responsibility, "Inactive duty"),
    ));
    await db.update(roleChecklistItems).set({ isActive: false }).where(and(
      eq(roleChecklistItems.organizationId, organizationId),
      eq(roleChecklistItems.definition, "Skip later"),
    ));
    await setEmployeeResponsibilityAdditionActive({ id: authorizedUserId }, {
      ...employeeScope,
      additionId: inactiveAddition.id,
      isActive: false,
    });

    const configuration = await getRoleDefinition({ id: authorizedUserId }, scope, role!.id);
    expect(configuration.responsibilities).toHaveLength(2);
    expect(configuration.checklists[0].items).toHaveLength(2);

    const effective = await getEffectiveEmployeeRole({ id: authorizedUserId }, employeeScope);
    const assigned = effective.assignedRoles.find((item) => item.id === role!.id);
    expect(assigned?.responsibilities.map((item) => item.responsibility)).toEqual(["Active duty"]);
    expect(assigned?.checklists[0].items.map((item) => item.definition)).toEqual(["Prep station"]);
    expect(effective.employeeResponsibilityAdditions.map((item) => item.id)).toContain(activeAddition.id);
    expect(effective.employeeResponsibilityAdditions.map((item) => item.id)).not.toContain(inactiveAddition.id);
    await expect(getEmployeeResponsibilityAddition({ id: authorizedUserId }, employeeScope, inactiveAddition.id)).resolves.toMatchObject({
      id: inactiveAddition.id,
      isActive: false,
    });

    const deactivated = await setBusinessRoleActive({ id: authorizedUserId }, { ...scope, roleId: role!.id, isActive: false });
    expect(deactivated.isActive).toBe(false);
    const unusedRole = await createRoleDefinition({ id: authorizedUserId }, {
      ...scope,
      identifier: "CFG-UNUSED",
      name: "Unused configuration role",
      purpose: "Reject assignment after deactivation",
    });
    createdRoleIds.push(unusedRole!.id);
    await setBusinessRoleActive({ id: authorizedUserId }, { ...scope, roleId: unusedRole!.id, isActive: false });
    await expect(assignEmployeeRole({ id: authorizedUserId }, { ...employeeScope, roleId: unusedRole!.id })).rejects.toMatchObject({
      code: "PREREQUISITE_NOT_SATISFIED",
      message: "Role definition is not active",
    });
    const afterRoleDeactivation = await getEffectiveEmployeeRole({ id: authorizedUserId }, employeeScope);
    expect(afterRoleDeactivation.assignedRoles.map((item) => item.id)).not.toContain(role!.id);
    await expect(getEmployeeRoleAssignment({ id: authorizedUserId }, employeeScope, assignment.id)).resolves.toMatchObject({
      id: assignment.id,
      roleId: role!.id,
    });
    await expect(setBusinessRoleActive({ id: deniedUserId }, { ...scope, roleId: role!.id, isActive: true })).rejects.toMatchObject({
      code: "ACCESS_DENIED",
    });
    await expect(setBusinessRoleActive({ id: authorizedUserId }, {
      ...otherOrgScope,
      roleId: role!.id,
      isActive: true,
    })).rejects.toMatchObject({ code: "ACCESS_DENIED" });
  });

  it("updates work definition and reminder stage status without rewriting existing instance snapshots", async () => {
    const definition = await createWorkSituationDefinition({ id: authorizedUserId }, {
      ...scope,
      triggerCategory: "routine",
      title: "Status work",
      description: "Status work",
      reminderEscalationStages: [
        { stage: "due_notification", position: 10 },
        { stage: "reminder", position: 20 },
        { stage: "escalation", position: 30 },
      ],
    });
    createdDefinitionIds.push(definition.id);
    const reminderStage = definition.reminderEscalationStages.find((stage) => stage.stage === "reminder");
    expect(reminderStage).toBeDefined();
    const instance = await createWorkInstance({ id: authorizedUserId }, {
      ...scope,
      workSituationDefinitionId: definition.id,
      instanceLocationId: locationId,
    });
    createdInstanceIds.push(instance.id);
    expect(
      (instance.definitionSnapshot as { reminderEscalationStages: Array<{ stage: string }> }).reminderEscalationStages.map((stage) => stage.stage),
    ).toEqual(["due_notification", "reminder", "escalation"]);

    await setWorkSituationReminderEscalationStageActive({ id: authorizedUserId }, {
      ...scope,
      workSituationDefinitionId: definition.id,
      stageId: reminderStage!.id,
      isActive: false,
    });
    const reread = await getWorkInstance({ id: authorizedUserId }, scope, instance.id);
    expect(reread.definitionSnapshot).toEqual(instance.definitionSnapshot);
    const laterInstance = await createWorkInstance({ id: authorizedUserId }, {
      ...scope,
      workSituationDefinitionId: definition.id,
      instanceLocationId: locationId,
    });
    createdInstanceIds.push(laterInstance.id);
    expect(
      (laterInstance.definitionSnapshot as { reminderEscalationStages: Array<{ stage: string }> }).reminderEscalationStages.map((stage) => stage.stage),
    ).toEqual(["due_notification", "escalation"]);

    const deactivated = await setWorkSituationDefinitionActive({ id: authorizedUserId }, {
      ...scope,
      workSituationDefinitionId: definition.id,
      isActive: false,
    });
    expect(deactivated.isActive).toBe(false);
    const configuration = await getWorkSituationDefinitionForScope({ id: authorizedUserId }, scope, definition.id);
    expect(configuration.isActive).toBe(false);
    await expect(createWorkInstance({ id: authorizedUserId }, {
      ...scope,
      workSituationDefinitionId: definition.id,
      instanceLocationId: locationId,
    })).rejects.toMatchObject({
      code: "PREREQUISITE_NOT_SATISFIED",
      message: "Work definition is not active",
    });
    const acknowledged = await transitionWorkInstance({ id: authorizedUserId }, {
      ...scope,
      instanceId: instance.id,
      state: "ACKNOWLEDGED",
    });
    expect(acknowledged.state).toBe("ACKNOWLEDGED");
    expect(acknowledged.definitionSnapshot).toEqual(instance.definitionSnapshot);
    await expect(setWorkSituationDefinitionActive({ id: authorizedUserId }, {
      ...otherOrgScope,
      workSituationDefinitionId: definition.id,
      isActive: true,
    })).rejects.toMatchObject({ code: "ACCESS_DENIED" });
  });
});
