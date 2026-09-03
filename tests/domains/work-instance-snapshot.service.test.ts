import "dotenv/config";
import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
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
  workInstances,
  workSituationDefinitions,
  workSituationEvidenceRequirements,
  workSituationReminderEscalationStages,
} from "@/db/schema";
import {
  createWorkInstance,
  createWorkSituationDefinition,
  getWorkInstance,
  transitionWorkInstance,
} from "@/domains/roles-work/service";
import { employeePermissions } from "@/lib/authorization-policy";

const organizationId = randomUUID();
const otherOrganizationId = randomUUID();
const locationId = randomUUID();
const otherOrgLocationId = randomUUID();
const authorizedUserId = `snapshot-authorized-${randomUUID()}`;
const deniedUserId = `snapshot-denied-${randomUUID()}`;
const authorizationRoleId = randomUUID();
const createdDefinitionIds: string[] = [];
const createdInstanceIds: string[] = [];
const scope = { organizationId, locationId };

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
    { id: organizationId, name: "Snapshot organization", code: `SS-${organizationId.slice(0, 8)}` },
    { id: otherOrganizationId, name: "Other snapshot organization", code: `SS-${otherOrganizationId.slice(0, 8)}` },
  ]);
  await db.insert(locations).values([
    { id: locationId, organizationId, name: "Snapshot location", code: "SS-LOC" },
    { id: otherOrgLocationId, organizationId: otherOrganizationId, name: "Other org location", code: "SS-OTHER" },
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
    code: `SS-ADMIN-${authorizationRoleId.slice(0, 8)}`,
    name: "Snapshot administrator",
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
  await db.delete(locationRoleAssignments).where(eq(locationRoleAssignments.userId, authorizedUserId));
  await db.delete(rolePermissions).where(eq(rolePermissions.roleId, authorizationRoleId));
  await db.delete(roles).where(eq(roles.id, authorizationRoleId));
  await db.delete(locationMemberships).where(eq(locationMemberships.userId, authorizedUserId));
  await db.delete(organizationMemberships).where(eq(organizationMemberships.userId, authorizedUserId));
  await db.delete(organizationMemberships).where(eq(organizationMemberships.userId, deniedUserId));
  await db.delete(authUsers).where(eq(authUsers.id, authorizedUserId));
  await db.delete(authUsers).where(eq(authUsers.id, deniedUserId));
  await db.delete(locations).where(eq(locations.id, locationId));
  await db.delete(locations).where(eq(locations.id, otherOrgLocationId));
  await db.delete(organizations).where(eq(organizations.id, organizationId));
  await db.delete(organizations).where(eq(organizations.id, otherOrganizationId));
});

describe("Work instance reminder and escalation snapshot foundation", () => {
  it("rejects unauthenticated snapshot-backed instance creation", async () => {
    await expect(createWorkInstance(null as never, {
      ...scope,
      workSituationDefinitionId: randomUUID(),
    })).rejects.toMatchObject({ code: "AUTHENTICATION_REQUIRED" });
  });

  it("captures ordered reminder and escalation configuration on the instance snapshot", async () => {
    const definition = await createWorkSituationDefinition({ id: authorizedUserId }, {
      ...scope,
      triggerCategory: "routine",
      title: "Opening",
      description: "Opening work",
      reminderEscalationStages: [
        { stage: "due_notification", position: 10 },
        { stage: "reminder", position: 20 },
        { stage: "escalation", position: 30 },
      ],
    });
    createdDefinitionIds.push(definition.id);
    const instance = await createWorkInstance({ id: authorizedUserId }, {
      ...scope,
      workSituationDefinitionId: definition.id,
      instanceLocationId: locationId,
    });
    createdInstanceIds.push(instance.id);
    const emptyDefinition = await createWorkSituationDefinition({ id: authorizedUserId }, {
      ...scope,
      triggerCategory: "routine",
      title: "No reminder stages",
      description: "No reminder stages",
    });
    createdDefinitionIds.push(emptyDefinition.id);
    const emptyInstance = await createWorkInstance({ id: authorizedUserId }, {
      ...scope,
      workSituationDefinitionId: emptyDefinition.id,
      instanceLocationId: locationId,
    });
    createdInstanceIds.push(emptyInstance.id);
    expect(
      (emptyInstance.definitionSnapshot as { reminderEscalationStages: unknown[] }).reminderEscalationStages,
    ).toEqual([]);

    expect(instance.definitionSnapshot).toMatchObject({
      workSituationDefinitionId: definition.id,
      reminderEscalationStages: [
        { stage: "due_notification", position: 10, isActive: true },
        { stage: "reminder", position: 20, isActive: true },
        { stage: "escalation", position: 30, isActive: true },
      ],
    });
  });

  it("does not rewrite the instance snapshot when live reminder configuration changes", async () => {
    const definition = await createWorkSituationDefinition({ id: authorizedUserId }, {
      ...scope,
      triggerCategory: "event-based",
      title: "Event work",
      description: "Event work",
      reminderEscalationStages: [
        { stage: "due_notification", position: 10 },
        { stage: "final_reminder", position: 20 },
      ],
    });
    createdDefinitionIds.push(definition.id);
    const instance = await createWorkInstance({ id: authorizedUserId }, {
      ...scope,
      workSituationDefinitionId: definition.id,
      instanceLocationId: locationId,
    });
    createdInstanceIds.push(instance.id);

    await db.insert(workSituationReminderEscalationStages).values({
      organizationId,
      workSituationDefinitionId: definition.id,
      stage: "exception_escalation",
      position: 30,
    });
    await db.update(workSituationReminderEscalationStages).set({
      stage: "strong_reminder",
    }).where(and(
      eq(workSituationReminderEscalationStages.workSituationDefinitionId, definition.id),
      eq(workSituationReminderEscalationStages.stage, "due_notification"),
    ));

    const reread = await getWorkInstance({ id: authorizedUserId }, scope, instance.id);
    expect(reread.definitionSnapshot).toMatchObject({
      title: "Event work",
      reminderEscalationStages: [
        { stage: "due_notification", position: 10 },
        { stage: "final_reminder", position: 20 },
      ],
    });
    expect(
      (reread.definitionSnapshot as { reminderEscalationStages: Array<{ stage: string }> }).reminderEscalationStages,
    ).toHaveLength(2);
  });

  it("does not rewrite reminder configuration during valid state transitions", async () => {
    const definition = await createWorkSituationDefinition({ id: authorizedUserId }, {
      ...scope,
      triggerCategory: "item/order-triggered",
      title: "Order work",
      description: "Order work",
      reminderEscalationStages: [{ stage: "due_notification", position: 10 }],
    });
    createdDefinitionIds.push(definition.id);
    const instance = await createWorkInstance({ id: authorizedUserId }, {
      ...scope,
      workSituationDefinitionId: definition.id,
      instanceLocationId: locationId,
    });
    createdInstanceIds.push(instance.id);
    const acknowledged = await transitionWorkInstance({ id: authorizedUserId }, {
      ...scope,
      instanceId: instance.id,
      state: "ACKNOWLEDGED",
    });
    expect(acknowledged.state).toBe("ACKNOWLEDGED");
    expect(acknowledged.definitionSnapshot).toMatchObject({
      reminderEscalationStages: [{ stage: "due_notification", position: 10 }],
    });
  });

  it("denies snapshot-backed instance creation outside authorized organization scope", async () => {
    const definition = await createWorkSituationDefinition({ id: authorizedUserId }, {
      ...scope,
      triggerCategory: "routine",
      title: "Scoped",
      description: "Scoped",
      reminderEscalationStages: [{ stage: "due_notification", position: 10 }],
    });
    createdDefinitionIds.push(definition.id);
    await expect(createWorkInstance({ id: authorizedUserId }, {
      organizationId: otherOrganizationId,
      locationId: otherOrgLocationId,
      workSituationDefinitionId: definition.id,
    })).rejects.toMatchObject({ code: "ACCESS_DENIED" });
    await expect(createWorkInstance({ id: deniedUserId }, {
      ...scope,
      workSituationDefinitionId: definition.id,
    })).rejects.toMatchObject({ code: "ACCESS_DENIED" });
  });
});
