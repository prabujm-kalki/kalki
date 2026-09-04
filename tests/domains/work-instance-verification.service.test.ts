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
  workInstances,
  workInstanceVerificationPresences,
  workSituationDefinitions,
  workSituationEvidenceRequirements,
  workSituationReminderEscalationStages,
} from "@/db/schema";
import {
  createWorkInstance,
  createWorkInstanceVerificationPresence,
  createWorkSituationDefinition,
  getWorkInstance,
  getWorkInstanceVerificationPresence,
  setWorkSituationDefinitionConfiguration,
  transitionWorkInstance,
} from "@/domains/roles-work/service";
import { employeePermissions } from "@/lib/authorization-policy";

const organizationId = randomUUID();
const otherOrganizationId = randomUUID();
const locationId = randomUUID();
const sameOrgOtherLocationId = randomUUID();
const otherOrgLocationId = randomUUID();
const authorizedUserId = `verification-presence-authorized-${randomUUID()}`;
const deniedUserId = `verification-presence-denied-${randomUUID()}`;
const authorizationRoleId = randomUUID();
const createdDefinitionIds: string[] = [];
const createdInstanceIds: string[] = [];
const createdPresenceIds: string[] = [];
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

async function createDefinition(suffix: string, options?: { verificationRequired?: boolean }) {
  const definition = await createWorkSituationDefinition({ id: authorizedUserId }, {
    ...scope,
    triggerCategory: "routine",
    title: `Verification ${suffix}`,
    description: `Definition ${suffix}`,
    verificationRequired: options?.verificationRequired ?? false,
  });
  createdDefinitionIds.push(definition.id);
  return definition;
}

async function createInstance(definitionId: string, instanceLocationId: string | null = locationId) {
  const instance = await createWorkInstance({ id: authorizedUserId }, {
    ...scope,
    workSituationDefinitionId: definitionId,
    instanceLocationId,
  });
  createdInstanceIds.push(instance.id);
  return instance;
}

async function reachCompleted(instanceId: string) {
  await transitionWorkInstance({ id: authorizedUserId }, { ...scope, instanceId, state: "ACKNOWLEDGED" });
  return transitionWorkInstance({ id: authorizedUserId }, { ...scope, instanceId, state: "COMPLETED" });
}

beforeAll(async () => {
  await db.insert(organizations).values([
    { id: organizationId, name: "Verification presence organization", code: `VP-${organizationId.slice(0, 8)}` },
    { id: otherOrganizationId, name: "Other verification presence organization", code: `VP-${otherOrganizationId.slice(0, 8)}` },
  ]);
  await db.insert(locations).values([
    { id: locationId, organizationId, name: "Verification presence location", code: "VP-LOC" },
    { id: sameOrgOtherLocationId, organizationId, name: "Same org other location", code: "VP-LOC-2" },
    { id: otherOrgLocationId, organizationId: otherOrganizationId, name: "Other org location", code: "VP-OTHER" },
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
    code: `VP-ADMIN-${authorizationRoleId.slice(0, 8)}`,
    name: "Verification presence administrator",
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
  for (const presenceId of createdPresenceIds) {
    await db.delete(workInstanceVerificationPresences).where(eq(workInstanceVerificationPresences.id, presenceId));
  }
  for (const instanceId of createdInstanceIds) {
    await db.delete(workInstanceVerificationPresences).where(eq(workInstanceVerificationPresences.workInstanceId, instanceId));
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

describe("Work instance verification presence foundation", () => {
  it("rejects unauthenticated and unauthorized presence operations", async () => {
    await expect(createWorkInstanceVerificationPresence(null, {
      ...scope,
      workInstanceId: randomUUID(),
    })).rejects.toMatchObject({ code: "AUTHENTICATION_REQUIRED" });
    await expect(getWorkInstanceVerificationPresence({ id: deniedUserId }, {
      ...scope,
      workInstanceId: randomUUID(),
    })).rejects.toMatchObject({ code: "ACCESS_DENIED" });
    await expect(createWorkInstanceVerificationPresence({ id: authorizedUserId }, {
      ...scope,
      workInstanceId: "not-a-uuid",
    })).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });

  it("creates and reads a same-organization presence for a scoped instance", async () => {
    const definition = await createDefinition("SAME");
    const instance = await createInstance(definition.id);
    const presence = await createWorkInstanceVerificationPresence({ id: authorizedUserId }, {
      ...scope,
      workInstanceId: instance.id,
    });
    createdPresenceIds.push(presence.id);
    expect(presence).toMatchObject({ organizationId, workInstanceId: instance.id });
    await expect(getWorkInstanceVerificationPresence({ id: authorizedUserId }, {
      ...scope,
      workInstanceId: instance.id,
    })).resolves.toMatchObject({ id: presence.id, workInstanceId: instance.id });
  });

  it("denies cross-organization and wrong-location presence access", async () => {
    const definition = await createDefinition("SCOPE");
    const instance = await createInstance(definition.id);
    await expect(createWorkInstanceVerificationPresence({ id: authorizedUserId }, {
      ...otherOrgScope,
      workInstanceId: instance.id,
    })).rejects.toMatchObject({ code: "ACCESS_DENIED" });
    await expect(getWorkInstanceVerificationPresence({ id: authorizedUserId }, {
      organizationId,
      locationId: sameOrgOtherLocationId,
      workInstanceId: instance.id,
    })).rejects.toMatchObject({ code: "ACCESS_DENIED" });
    await expect(createWorkInstanceVerificationPresence({ id: authorizedUserId }, {
      organizationId,
      locationId: sameOrgOtherLocationId,
      workInstanceId: instance.id,
    })).rejects.toMatchObject({ code: "ACCESS_DENIED" });
  });

  it("records verification presence idempotently without rewriting the instance snapshot", async () => {
    const definition = await createDefinition("DUP");
    const instance = await createInstance(definition.id);
    const presence = await createWorkInstanceVerificationPresence({ id: authorizedUserId }, {
      ...scope,
      workInstanceId: instance.id,
    });
    createdPresenceIds.push(presence.id);
    const replay = await createWorkInstanceVerificationPresence({ id: authorizedUserId }, {
      ...scope,
      workInstanceId: instance.id,
    });
    expect(replay).toMatchObject({
      id: presence.id,
      organizationId,
      workInstanceId: instance.id,
    });
    expect(replay.createdAt).toEqual(presence.createdAt);
    const rows = await db.select().from(workInstanceVerificationPresences).where(
      eq(workInstanceVerificationPresences.workInstanceId, instance.id),
    );
    expect(rows).toHaveLength(1);
    const reread = await getWorkInstance({ id: authorizedUserId }, scope, instance.id);
    expect(reread.definitionSnapshot).toEqual(instance.definitionSnapshot);
    expect(reread.state).toBe("SEEN");
  });

  it("blocks VERIFIED without presence and allows VERIFIED after valid presence", async () => {
    const definition = await createDefinition("GATE", { verificationRequired: true });
    const instance = await createInstance(definition.id);
    const completed = await reachCompleted(instance.id);
    expect(completed.state).toBe("COMPLETED");
    await expect(transitionWorkInstance({ id: authorizedUserId }, {
      ...scope,
      instanceId: instance.id,
      state: "VERIFIED",
    })).rejects.toMatchObject({
      code: "PREREQUISITE_NOT_SATISFIED",
      message: "Required verification cannot be satisfied because verification presence is not recorded",
    });
    expect(completed.state).not.toBe("VERIFIED");
    const presence = await createWorkInstanceVerificationPresence({ id: authorizedUserId }, {
      ...scope,
      workInstanceId: instance.id,
    });
    createdPresenceIds.push(presence.id);
    const verified = await transitionWorkInstance({ id: authorizedUserId }, {
      ...scope,
      instanceId: instance.id,
      state: "VERIFIED",
    });
    expect(verified.state).toBe("VERIFIED");
    expect(verified.state).not.toBe("COMPLETED");
  });

  it("does not require presence when verification is not required", async () => {
    const definition = await createDefinition("OPTIONAL");
    const instance = await createInstance(definition.id);
    await reachCompleted(instance.id);
    const verified = await transitionWorkInstance({ id: authorizedUserId }, {
      ...scope,
      instanceId: instance.id,
      state: "VERIFIED",
    });
    expect(verified.state).toBe("VERIFIED");
  });

  it("uses the instance snapshot after the live definition starts requiring verification", async () => {
    const definition = await createDefinition("SNAP");
    const instance = await createInstance(definition.id);
    await setWorkSituationDefinitionConfiguration({ id: authorizedUserId }, {
      ...scope,
      workSituationDefinitionId: definition.id,
      verificationRequired: true,
    });
    await reachCompleted(instance.id);
    const verified = await transitionWorkInstance({ id: authorizedUserId }, {
      ...scope,
      instanceId: instance.id,
      state: "VERIFIED",
    });
    expect(verified.state).toBe("VERIFIED");
    expect(verified.definitionSnapshot).toMatchObject({ verificationRequired: false });
  });

  it("does not let one instance presence satisfy another instance", async () => {
    const definition = await createDefinition("ISOLATE", { verificationRequired: true });
    const first = await createInstance(definition.id);
    const second = await createInstance(definition.id);
    const presence = await createWorkInstanceVerificationPresence({ id: authorizedUserId }, {
      ...scope,
      workInstanceId: first.id,
    });
    createdPresenceIds.push(presence.id);
    await reachCompleted(second.id);
    await expect(transitionWorkInstance({ id: authorizedUserId }, {
      ...scope,
      instanceId: second.id,
      state: "VERIFIED",
    })).rejects.toMatchObject({ code: "PREREQUISITE_NOT_SATISFIED" });
  });
});
