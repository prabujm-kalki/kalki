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
  generateWorkInstance,
  getWorkInstance,
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
const authorizedUserId = `work-generation-authorized-${randomUUID()}`;
const deniedUserId = `work-generation-denied-${randomUUID()}`;
const authorizationRoleId = randomUUID();
const createdDefinitionIds: string[] = [];
const createdInstanceIds: string[] = [];
const scope = { organizationId, locationId };
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
    { id: organizationId, name: "Work generation organization", code: `WG-${organizationId.slice(0, 8)}` },
    { id: otherOrganizationId, name: "Other work generation organization", code: `WG-${otherOrganizationId.slice(0, 8)}` },
  ]);
  await db.insert(locations).values([
    { id: locationId, organizationId, name: "Work generation location", code: "WG-LOC" },
    { id: sameOrgOtherLocationId, organizationId, name: "Same org other location", code: "WG-LOC-2" },
    { id: otherOrgLocationId, organizationId: otherOrganizationId, name: "Other org location", code: "WG-OTHER" },
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
    code: `WG-ADMIN-${authorizationRoleId.slice(0, 8)}`,
    name: "Work generation administrator",
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
  await db.delete(authUsers).where(eq(authUsers.id, deniedUserId));
  // Organization, location, and actor user rows remain as append-only audit anchors.
});

describe("Work instance generation from source provenance", () => {
  it("rejects unauthenticated, unauthorized, and invalid generation", async () => {
    await expect(generateWorkInstance(null, {
      ...scope,
      workSituationDefinitionId: randomUUID(),
      triggerCategory: "event-based",
      sourceReference: "event-1",
    })).rejects.toMatchObject({ code: "AUTHENTICATION_REQUIRED" });
    await expect(generateWorkInstance({ id: deniedUserId }, {
      ...scope,
      workSituationDefinitionId: randomUUID(),
      triggerCategory: "event-based",
      sourceReference: "event-1",
    })).rejects.toMatchObject({ code: "ACCESS_DENIED" });
    await expect(generateWorkInstance({ id: authorizedUserId }, {
      ...scope,
      workSituationDefinitionId: randomUUID(),
      triggerCategory: "event-based",
    } as never)).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });

  it("generates event and order instances through the normal create path with required source identity", async () => {
    const eventDefinition = await createWorkSituationDefinition({ id: authorizedUserId }, {
      ...scope,
      triggerCategory: "event-based",
      title: "Event work",
      description: "Event work",
      evidenceRequired: true,
    });
    createdDefinitionIds.push(eventDefinition.id);
    const orderDefinition = await createWorkSituationDefinition({ id: authorizedUserId }, {
      ...scope,
      triggerCategory: "item/order-triggered",
      title: "Order work",
      description: "Order work",
    });
    createdDefinitionIds.push(orderDefinition.id);

    await expect(createWorkInstance({ id: authorizedUserId }, {
      ...scope,
      workSituationDefinitionId: eventDefinition.id,
      instanceLocationId: locationId,
    })).rejects.toMatchObject({
      code: "INVALID_INPUT",
      message: "Source reference is required for event-based and item/order-triggered work",
    });

    const generated = await generateWorkInstance({ id: authorizedUserId }, {
      ...scope,
      workSituationDefinitionId: eventDefinition.id,
      triggerCategory: "event-based",
      instanceLocationId: locationId,
      sourceReference: "pos-event-88",
      sourceMetadata: { origin: "point-of-sale" },
    });
    createdInstanceIds.push(generated.id);
    expect(generated).toMatchObject({
      state: "SEEN",
      sourceReference: "pos-event-88",
      sourceMetadata: { origin: "point-of-sale" },
      workSituationDefinitionId: eventDefinition.id,
    });
    expect(generated.definitionSnapshot).toMatchObject({
      triggerCategory: "event-based",
      evidenceRequired: true,
      workSituationDefinitionId: eventDefinition.id,
    });

    const orderInstance = await generateWorkInstance({ id: authorizedUserId }, {
      ...scope,
      workSituationDefinitionId: orderDefinition.id,
      triggerCategory: "item/order-triggered",
      instanceLocationId: locationId,
      sourceReference: "order-91",
    });
    createdInstanceIds.push(orderInstance.id);
    expect(orderInstance.definitionSnapshot).toMatchObject({ triggerCategory: "item/order-triggered" });

    await expect(generateWorkInstance({ id: authorizedUserId }, {
      ...scope,
      workSituationDefinitionId: eventDefinition.id,
      triggerCategory: "routine",
      sourceReference: "wrong-category",
      instanceLocationId: locationId,
    })).rejects.toMatchObject({
      code: "INVALID_INPUT",
      message: "Work definition trigger category does not match the generation request",
    });
  });

  it("returns the same instance on source retry without rewriting snapshot or state", async () => {
    const definition = await createWorkSituationDefinition({ id: authorizedUserId }, {
      ...scope,
      triggerCategory: "event-based",
      title: "Retry work",
      description: "Retry work",
    });
    createdDefinitionIds.push(definition.id);
    const first = await generateWorkInstance({ id: authorizedUserId }, {
      ...scope,
      workSituationDefinitionId: definition.id,
      triggerCategory: "event-based",
      instanceLocationId: locationId,
      sourceReference: "retry-source",
    });
    createdInstanceIds.push(first.id);
    const acknowledged = await transitionWorkInstance({ id: authorizedUserId }, {
      ...scope,
      instanceId: first.id,
      state: "ACKNOWLEDGED",
    });
    expect(acknowledged.state).toBe("ACKNOWLEDGED");

    await setWorkSituationDefinitionConfiguration({ id: authorizedUserId }, {
      ...scope,
      workSituationDefinitionId: definition.id,
      evidenceRequired: true,
      severity: "high",
    });
    const replay = await generateWorkInstance({ id: authorizedUserId }, {
      ...scope,
      workSituationDefinitionId: definition.id,
      triggerCategory: "event-based",
      instanceLocationId: locationId,
      sourceReference: "retry-source",
      sourceMetadata: { ignored: true },
    });
    expect(replay.id).toBe(first.id);
    expect(replay.state).toBe("ACKNOWLEDGED");
    expect(replay.definitionSnapshot).toEqual(first.definitionSnapshot);
    expect(replay.sourceMetadata).toEqual({});
    const rows = await db.select().from(workInstances).where(and(
      eq(workInstances.organizationId, organizationId),
      eq(workInstances.sourceReference, "retry-source"),
    ));
    expect(rows).toHaveLength(1);

    const later = await generateWorkInstance({ id: authorizedUserId }, {
      ...scope,
      workSituationDefinitionId: definition.id,
      triggerCategory: "event-based",
      instanceLocationId: locationId,
      sourceReference: "later-source",
    });
    createdInstanceIds.push(later.id);
    expect(later.id).not.toBe(first.id);
    expect(later.definitionSnapshot).toMatchObject({ evidenceRequired: true, severity: "high" });
  });

  it("keeps generated history after definition deactivation and isolates organizations and locations", async () => {
    const definition = await createWorkSituationDefinition({ id: authorizedUserId }, {
      ...scope,
      triggerCategory: "event-based",
      title: "Scoped work",
      description: "Scoped work",
    });
    createdDefinitionIds.push(definition.id);
    const generated = await generateWorkInstance({ id: authorizedUserId }, {
      ...scope,
      workSituationDefinitionId: definition.id,
      triggerCategory: "event-based",
      instanceLocationId: locationId,
      sourceReference: "scoped-source",
    });
    createdInstanceIds.push(generated.id);

    await setWorkSituationDefinitionActive({ id: authorizedUserId }, {
      ...scope,
      workSituationDefinitionId: definition.id,
      isActive: false,
    });
    const replay = await generateWorkInstance({ id: authorizedUserId }, {
      ...scope,
      workSituationDefinitionId: definition.id,
      triggerCategory: "event-based",
      instanceLocationId: locationId,
      sourceReference: "scoped-source",
    });
    expect(replay.id).toBe(generated.id);
    expect(replay.definitionSnapshot).toEqual(generated.definitionSnapshot);
    await expect(generateWorkInstance({ id: authorizedUserId }, {
      ...scope,
      workSituationDefinitionId: definition.id,
      triggerCategory: "event-based",
      instanceLocationId: locationId,
      sourceReference: "new-after-inactive",
    })).rejects.toMatchObject({
      code: "PREREQUISITE_NOT_SATISFIED",
      message: "Work definition is not active",
    });

    await expect(generateWorkInstance({ id: authorizedUserId }, {
      organizationId,
      locationId: sameOrgOtherLocationId,
      workSituationDefinitionId: definition.id,
      triggerCategory: "event-based",
      sourceReference: "scoped-source",
    })).rejects.toMatchObject({ code: "ACCESS_DENIED" });
    await expect(generateWorkInstance({ id: authorizedUserId }, {
      ...otherOrgScope,
      workSituationDefinitionId: definition.id,
      triggerCategory: "event-based",
      sourceReference: "scoped-source",
    })).rejects.toMatchObject({ code: "ACCESS_DENIED" });
    await expect(getWorkInstance({ id: authorizedUserId }, {
      organizationId,
      locationId: sameOrgOtherLocationId,
    }, generated.id)).rejects.toMatchObject({ code: "ACCESS_DENIED" });
  });
});
