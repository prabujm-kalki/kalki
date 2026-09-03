import "dotenv/config";
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import {
  authUsers,
  employees,
  locationMemberships,
  locationRoleAssignments,
  locations,
  organizationMemberships,
  organizations,
  people,
  permissions,
  rolePermissions,
  roles,
  workInstanceEvidencePresences,
  workInstanceVerificationPresences,
  workInstances,
  workSituationDefinitions,
  workSituationEvidenceRequirements,
  workSituationReminderEscalationStages,
} from "@/db/schema";
import {
  createWorkInstance,
  createWorkInstanceEvidencePresence,
  createWorkInstanceVerificationPresence,
  createWorkSituationDefinition,
  generateWorkInstance,
  getWorkInstance,
  listWorkInstances,
  setWorkSituationDefinitionActive,
  setWorkSituationDefinitionConfiguration,
  transitionWorkInstance,
} from "@/domains/roles-work/service";
import { employeePermissions } from "@/lib/authorization-policy";

const organizationId = randomUUID();
const otherOrganizationId = randomUUID();
const locationId = randomUUID();
const sameOrgOtherLocationId = randomUUID();
const otherOrgLocationId = randomUUID();
const authorizedUserId = `work-ops-authorized-${randomUUID()}`;
const deniedUserId = `work-ops-denied-${randomUUID()}`;
const authorizationRoleId = randomUUID();
const personId = randomUUID();
const secondPersonId = randomUUID();
const otherLocationPersonId = randomUUID();
const otherOrgPersonId = randomUUID();
const employeeId = randomUUID();
const secondEmployeeId = randomUUID();
const otherLocationEmployeeId = randomUUID();
const otherOrgEmployeeId = randomUUID();
const createdDefinitionIds: string[] = [];
const createdInstanceIds: string[] = [];
const scope = { organizationId, locationId };
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

async function createDefinition(title: string, options?: { evidenceRequired?: boolean; verificationRequired?: boolean }) {
  const definition = await createWorkSituationDefinition({ id: authorizedUserId }, {
    ...scope,
    triggerCategory: "routine",
    title,
    description: `${title} definition`,
    evidenceRequired: options?.evidenceRequired ?? false,
    verificationRequired: options?.verificationRequired ?? false,
  });
  createdDefinitionIds.push(definition.id);
  return definition;
}

beforeAll(async () => {
  await db.insert(organizations).values([
    { id: organizationId, name: "Work operations organization", code: `WO-${organizationId.slice(0, 8)}` },
    { id: otherOrganizationId, name: "Other work operations organization", code: `WO-${otherOrganizationId.slice(0, 8)}` },
  ]);
  await db.insert(locations).values([
    { id: locationId, organizationId, name: "Work operations location", code: "WO-LOC" },
    { id: sameOrgOtherLocationId, organizationId, name: "Same org other location", code: "WO-LOC-2" },
    { id: otherOrgLocationId, organizationId: otherOrganizationId, name: "Other org location", code: "WO-OTHER" },
  ]);
  await db.insert(people).values([
    { id: personId, firstName: "Ops", displayName: "Ops Worker" },
    { id: secondPersonId, firstName: "Second", displayName: "Second Worker" },
    { id: otherLocationPersonId, firstName: "OtherLoc", displayName: "Other Location Worker" },
    { id: otherOrgPersonId, firstName: "OtherOrg", displayName: "Other Org Worker" },
  ]);
  await db.insert(employees).values([
    { id: employeeId, personId, organizationId, locationId, employeeCode: "WO-EMP", employmentStartDate: "2026-09-03" },
    { id: secondEmployeeId, personId: secondPersonId, organizationId, locationId, employeeCode: "WO-EMP-2", employmentStartDate: "2026-09-03" },
    {
      id: otherLocationEmployeeId,
      personId: otherLocationPersonId,
      organizationId,
      locationId: sameOrgOtherLocationId,
      employeeCode: "WO-EMP-3",
      employmentStartDate: "2026-09-03",
    },
    {
      id: otherOrgEmployeeId,
      personId: otherOrgPersonId,
      organizationId: otherOrganizationId,
      locationId: otherOrgLocationId,
      employeeCode: "WO-OTHER",
      employmentStartDate: "2026-09-03",
    },
  ]);
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
    code: `WO-ADMIN-${authorizationRoleId.slice(0, 8)}`,
    name: "Work operations administrator",
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
    await db.delete(workInstanceEvidencePresences).where(eq(workInstanceEvidencePresences.workInstanceId, instanceId));
    await db.delete(workInstanceVerificationPresences).where(eq(workInstanceVerificationPresences.workInstanceId, instanceId));
    await db.delete(workInstances).where(eq(workInstances.id, instanceId));
  }
  for (const definitionId of createdDefinitionIds) {
    await db.delete(workInstanceEvidencePresences).where(eq(workInstanceEvidencePresences.organizationId, organizationId));
    await db.delete(workInstanceVerificationPresences).where(eq(workInstanceVerificationPresences.organizationId, organizationId));
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
  await db.delete(employees).where(eq(employees.id, employeeId));
  await db.delete(employees).where(eq(employees.id, secondEmployeeId));
  await db.delete(employees).where(eq(employees.id, otherLocationEmployeeId));
  await db.delete(employees).where(eq(employees.id, otherOrgEmployeeId));
  await db.delete(people).where(eq(people.id, personId));
  await db.delete(people).where(eq(people.id, secondPersonId));
  await db.delete(people).where(eq(people.id, otherLocationPersonId));
  await db.delete(people).where(eq(people.id, otherOrgPersonId));
  await db.delete(authUsers).where(eq(authUsers.id, authorizedUserId));
  await db.delete(authUsers).where(eq(authUsers.id, deniedUserId));
  await db.delete(locations).where(eq(locations.id, locationId));
  await db.delete(locations).where(eq(locations.id, sameOrgOtherLocationId));
  await db.delete(locations).where(eq(locations.id, otherOrgLocationId));
  await db.delete(organizations).where(eq(organizations.id, organizationId));
  await db.delete(organizations).where(eq(organizations.id, otherOrganizationId));
});

describe("Work instance operational query and visibility", () => {
  it("filters assigned and generated work by existing instance identity without rewriting snapshots", async () => {
    const opening = await createDefinition("Ops opening");
    const closing = await createDefinition("Ops closing");
    const assignedOpening = await createWorkInstance({ id: authorizedUserId }, {
      ...scope,
      workSituationDefinitionId: opening.id,
      instanceLocationId: locationId,
      assignedEmployeeId: employeeId,
      sourceReference: "ops-opening-assigned",
    });
    const secondAssigned = await createWorkInstance({ id: authorizedUserId }, {
      ...scope,
      workSituationDefinitionId: opening.id,
      instanceLocationId: locationId,
      assignedEmployeeId: secondEmployeeId,
      sourceReference: "ops-opening-second",
    });
    const generatedClosing = await generateWorkInstance({ id: authorizedUserId }, {
      ...scope,
      workSituationDefinitionId: closing.id,
      triggerCategory: "routine",
      sourceReference: "ops-closing-generated",
    });
    createdInstanceIds.push(assignedOpening.id, secondAssigned.id, generatedClosing.id);
    const snapshot = assignedOpening.definitionSnapshot;

    const byEmployee = await listWorkInstances({ id: authorizedUserId }, { ...scope, assignedEmployeeId: employeeId });
    expect(byEmployee.map((item) => item.id)).toEqual([assignedOpening.id]);
    const byDefinition = await listWorkInstances({ id: authorizedUserId }, { ...scope, workSituationDefinitionId: closing.id });
    expect(byDefinition.map((item) => item.id)).toEqual([generatedClosing.id]);
    const bySource = await listWorkInstances({ id: authorizedUserId }, { ...scope, sourceReference: "ops-closing-generated" });
    expect(bySource.map((item) => item.id)).toEqual([generatedClosing.id]);
    const retried = await listWorkInstances({ id: authorizedUserId }, { ...scope, sourceReference: "ops-closing-generated" });
    expect(retried.map((item) => item.id)).toEqual([generatedClosing.id]);
    const byState = await listWorkInstances({ id: authorizedUserId }, { ...scope, state: "SEEN", assignedEmployeeId: employeeId });
    expect(byState.map((item) => item.id)).toEqual([assignedOpening.id]);

    await setWorkSituationDefinitionConfiguration({ id: authorizedUserId }, {
      ...scope,
      workSituationDefinitionId: opening.id,
      evidenceRequired: true,
    });
    const reread = await getWorkInstance({ id: authorizedUserId }, scope, assignedOpening.id);
    expect(reread.definitionSnapshot).toEqual(snapshot);
    expect(reread.assignedEmployeeId).toBe(employeeId);

    await db.update(employees).set({ isActive: false }).where(eq(employees.id, employeeId));
    const afterEmployeeDeactivation = await listWorkInstances({ id: authorizedUserId }, { ...scope, assignedEmployeeId: employeeId });
    expect(afterEmployeeDeactivation.map((item) => item.id)).toEqual([assignedOpening.id]);
    await db.update(employees).set({ isActive: true }).where(eq(employees.id, employeeId));

    await setWorkSituationDefinitionActive({ id: authorizedUserId }, {
      ...scope,
      workSituationDefinitionId: closing.id,
      isActive: false,
    });
    const afterDefinitionDeactivation = await listWorkInstances({ id: authorizedUserId }, { ...scope, workSituationDefinitionId: closing.id });
    expect(afterDefinitionDeactivation.map((item) => item.id)).toEqual([generatedClosing.id]);
  });

  it("rejects invalid, unauthorized, cross-location, and cross-organization operational queries", async () => {
    const definition = await createDefinition("Ops scoped");
    const instance = await createWorkInstance({ id: authorizedUserId }, {
      ...scope,
      workSituationDefinitionId: definition.id,
      instanceLocationId: locationId,
      assignedEmployeeId: employeeId,
      sourceReference: "ops-scoped",
    });
    createdInstanceIds.push(instance.id);

    await expect(listWorkInstances({ id: authorizedUserId }, { ...scope, state: "TODO" as "SEEN" })).rejects.toMatchObject({
      code: "INVALID_INPUT",
    });
    await expect(listWorkInstances({ id: authorizedUserId }, { ...scope, assignedEmployeeId: "not-a-uuid" })).rejects.toMatchObject({
      code: "INVALID_INPUT",
    });
    await expect(listWorkInstances({ id: deniedUserId }, { ...scope, assignedEmployeeId: employeeId })).rejects.toMatchObject({
      code: "ACCESS_DENIED",
    });
    await expect(listWorkInstances({ id: authorizedUserId }, { ...sameOrgOtherLocationScope, assignedEmployeeId: employeeId })).rejects.toMatchObject({
      code: "ACCESS_DENIED",
    });
    await expect(listWorkInstances({ id: authorizedUserId }, { ...otherOrgScope, assignedEmployeeId: employeeId })).rejects.toMatchObject({
      code: "ACCESS_DENIED",
    });
    await expect(listWorkInstances({ id: authorizedUserId }, { ...scope, assignedEmployeeId: otherOrgEmployeeId })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(listWorkInstances({ id: authorizedUserId }, { ...scope, workSituationDefinitionId: randomUUID() })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(getWorkInstance({ id: authorizedUserId }, sameOrgOtherLocationScope, instance.id)).rejects.toMatchObject({
      code: "ACCESS_DENIED",
    });
    const otherLocationQuery = await listWorkInstances({ id: authorizedUserId }, { ...scope, assignedEmployeeId: otherLocationEmployeeId });
    expect(otherLocationQuery).toEqual([]);
  });

  it("exposes evidence and verification gates on the operational read path", async () => {
    const definition = await createDefinition("Ops gated", { evidenceRequired: true, verificationRequired: true });
    const instance = await createWorkInstance({ id: authorizedUserId }, {
      ...scope,
      workSituationDefinitionId: definition.id,
      instanceLocationId: locationId,
      assignedEmployeeId: employeeId,
      sourceReference: "ops-gated",
    });
    createdInstanceIds.push(instance.id);

    const seen = await getWorkInstance({ id: authorizedUserId }, scope, instance.id);
    expect(seen).toMatchObject({
      id: instance.id,
      state: "SEEN",
      evidenceRequired: true,
      verificationRequired: true,
      evidencePresence: null,
      verificationPresence: null,
      allowedNextState: "ACKNOWLEDGED",
      nextTransitionReady: true,
    });
    const listed = await listWorkInstances({ id: authorizedUserId }, {
      ...scope,
      workSituationDefinitionId: definition.id,
      assignedEmployeeId: employeeId,
    });
    expect(listed).toEqual([expect.objectContaining({ id: instance.id, nextTransitionReady: true })]);

    const acknowledged = await transitionWorkInstance({ id: authorizedUserId }, {
      ...scope,
      instanceId: instance.id,
      state: "ACKNOWLEDGED",
    });
    expect(acknowledged).toMatchObject({
      state: "ACKNOWLEDGED",
      allowedNextState: "COMPLETED",
      nextTransitionReady: false,
      evidencePresence: null,
    });
    await expect(transitionWorkInstance({ id: authorizedUserId }, {
      ...scope,
      instanceId: instance.id,
      state: "COMPLETED",
    })).rejects.toMatchObject({ code: "PREREQUISITE_NOT_SATISFIED" });

    await createWorkInstanceEvidencePresence({ id: authorizedUserId }, { ...scope, workInstanceId: instance.id });
    const readyToComplete = await getWorkInstance({ id: authorizedUserId }, scope, instance.id);
    expect(readyToComplete.nextTransitionReady).toBe(true);
    expect(readyToComplete.evidencePresence).toMatchObject({ workInstanceId: instance.id });
    const completed = await transitionWorkInstance({ id: authorizedUserId }, {
      ...scope,
      instanceId: instance.id,
      state: "COMPLETED",
    });
    expect(completed).toMatchObject({
      state: "COMPLETED",
      allowedNextState: "VERIFIED",
      nextTransitionReady: false,
    });

    await createWorkInstanceVerificationPresence({ id: authorizedUserId }, { ...scope, workInstanceId: instance.id });
    const readyToVerify = await getWorkInstance({ id: authorizedUserId }, scope, instance.id);
    expect(readyToVerify.nextTransitionReady).toBe(true);
    const verified = await transitionWorkInstance({ id: authorizedUserId }, {
      ...scope,
      instanceId: instance.id,
      state: "VERIFIED",
    });
    expect(verified).toMatchObject({
      state: "VERIFIED",
      allowedNextState: null,
      nextTransitionReady: false,
    });
    expect(verified.definitionSnapshot).toEqual(instance.definitionSnapshot);
    const byCompleted = await listWorkInstances({ id: authorizedUserId }, {
      ...scope,
      workSituationDefinitionId: definition.id,
      state: "COMPLETED",
    });
    expect(byCompleted).toEqual([]);
    const byVerified = await listWorkInstances({ id: authorizedUserId }, {
      ...scope,
      workSituationDefinitionId: definition.id,
      state: "VERIFIED",
    });
    expect(byVerified.map((item) => item.id)).toEqual([instance.id]);
  });
});
