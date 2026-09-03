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
  workInstanceEvidencePresences,
  workInstances,
  workSituationDefinitions,
  workSituationEvidenceRequirements,
  workSituationReminderEscalationStages,
} from "@/db/schema";
import {
  createWorkInstance,
  createWorkInstanceEvidencePresence,
  createWorkSituationDefinition,
  getWorkInstanceEvidencePresence,
  RolesWorkServiceError,
  transitionWorkInstance,
} from "@/domains/roles-work/service";
import { employeePermissions } from "@/lib/authorization-policy";

const organizationId = randomUUID();
const otherOrganizationId = randomUUID();
const locationId = randomUUID();
const sameOrgOtherLocationId = randomUUID();
const otherOrgLocationId = randomUUID();
const authorizedUserId = `evidence-presence-authorized-${randomUUID()}`;
const deniedUserId = `evidence-presence-denied-${randomUUID()}`;
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

async function createDefinition(suffix: string, options?: { evidenceRequired?: boolean; verificationRequired?: boolean }) {
  const definition = await createWorkSituationDefinition({ id: authorizedUserId }, {
    ...scope,
    triggerCategory: "routine",
    title: `Evidence ${suffix}`,
    description: `Definition ${suffix}`,
    evidenceRequired: options?.evidenceRequired ?? false,
    verificationRequired: options?.verificationRequired ?? false,
  });
  createdDefinitionIds.push(definition.id);
  return definition;
}

async function createInstance(definitionId: string, instanceLocationId?: string | null) {
  const instance = await createWorkInstance({ id: authorizedUserId }, {
    ...scope,
    workSituationDefinitionId: definitionId,
    ...(instanceLocationId === undefined ? {} : { instanceLocationId }),
  });
  createdInstanceIds.push(instance.id);
  return instance;
}

beforeAll(async () => {
  await db.insert(organizations).values([
    { id: organizationId, name: "Evidence presence organization", code: `EP-${organizationId.slice(0, 8)}` },
    { id: otherOrganizationId, name: "Other evidence presence organization", code: `EP-${otherOrganizationId.slice(0, 8)}` },
  ]);
  await db.insert(locations).values([
    { id: locationId, organizationId, name: "Evidence presence location", code: "EP-LOC" },
    { id: sameOrgOtherLocationId, organizationId, name: "Same org other location", code: "EP-LOC-2" },
    { id: otherOrgLocationId, organizationId: otherOrganizationId, name: "Other org location", code: "EP-OTHER" },
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
    code: `EP-ADMIN-${authorizationRoleId.slice(0, 8)}`,
    name: "Evidence presence administrator",
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
    await db.delete(workInstanceEvidencePresences).where(eq(workInstanceEvidencePresences.id, presenceId));
  }
  for (const instanceId of createdInstanceIds) {
    await db.delete(workInstanceEvidencePresences).where(eq(workInstanceEvidencePresences.workInstanceId, instanceId));
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
  await db.delete(locations).where(eq(locations.id, sameOrgOtherLocationId));
  await db.delete(locations).where(eq(locations.id, otherOrgLocationId));
  await db.delete(organizations).where(eq(organizations.id, organizationId));
  await db.delete(organizations).where(eq(organizations.id, otherOrganizationId));
});

describe("Work instance evidence presence foundation", () => {
  it("rejects unauthenticated and unauthorized presence operations", async () => {
    await expect(createWorkInstanceEvidencePresence(null, {
      ...scope,
      workInstanceId: randomUUID(),
    })).rejects.toMatchObject({ code: "AUTHENTICATION_REQUIRED" });
    await expect(getWorkInstanceEvidencePresence({ id: deniedUserId }, {
      ...scope,
      workInstanceId: randomUUID(),
    })).rejects.toMatchObject({ code: "ACCESS_DENIED" });
  });

  it("creates and reads a same-organization presence for a scoped instance", async () => {
    const definition = await createDefinition("SAME");
    const instance = await createInstance(definition.id, locationId);
    const presence = await createWorkInstanceEvidencePresence({ id: authorizedUserId }, {
      ...scope,
      workInstanceId: instance.id,
    });
    createdPresenceIds.push(presence.id);
    expect(presence).toMatchObject({
      organizationId,
      workInstanceId: instance.id,
    });
    await expect(getWorkInstanceEvidencePresence({ id: authorizedUserId }, {
      ...scope,
      workInstanceId: instance.id,
    })).resolves.toMatchObject({ id: presence.id, workInstanceId: instance.id });
  });

  it("denies cross-organization and wrong-location presence access", async () => {
    const definition = await createDefinition("SCOPE");
    const instance = await createInstance(definition.id, locationId);
    await expect(createWorkInstanceEvidencePresence({ id: authorizedUserId }, {
      ...otherOrgScope,
      workInstanceId: instance.id,
    })).rejects.toMatchObject({ code: "ACCESS_DENIED" });
    await expect(getWorkInstanceEvidencePresence({ id: authorizedUserId }, {
      organizationId,
      locationId: sameOrgOtherLocationId,
      workInstanceId: instance.id,
    })).rejects.toMatchObject({ code: "ACCESS_DENIED" });
    await expect(createWorkInstanceEvidencePresence({ id: authorizedUserId }, {
      organizationId,
      locationId: sameOrgOtherLocationId,
      workInstanceId: instance.id,
    })).rejects.toMatchObject({ code: "ACCESS_DENIED" });
  });

  it("rejects a second presence for the same work instance", async () => {
    const definition = await createDefinition("DUP");
    const instance = await createInstance(definition.id, locationId);
    const presence = await createWorkInstanceEvidencePresence({ id: authorizedUserId }, {
      ...scope,
      workInstanceId: instance.id,
    });
    createdPresenceIds.push(presence.id);
    await expect(createWorkInstanceEvidencePresence({ id: authorizedUserId }, {
      ...scope,
      workInstanceId: instance.id,
    })).rejects.toMatchObject({ code: "DUPLICATE_RECORD" });
  });

  it("blocks COMPLETED without presence and allows COMPLETED after valid presence", async () => {
    const definition = await createDefinition("GATE", { evidenceRequired: true });
    const instance = await createInstance(definition.id, locationId);
    await transitionWorkInstance({ id: authorizedUserId }, {
      ...scope,
      instanceId: instance.id,
      state: "ACKNOWLEDGED",
    });
    await expect(transitionWorkInstance({ id: authorizedUserId }, {
      ...scope,
      instanceId: instance.id,
      state: "COMPLETED",
    })).rejects.toMatchObject({
      code: "PREREQUISITE_NOT_SATISFIED",
      message: "Mandatory evidence cannot be satisfied because evidence presence is not recorded",
    });
    const presence = await createWorkInstanceEvidencePresence({ id: authorizedUserId }, {
      ...scope,
      workInstanceId: instance.id,
    });
    createdPresenceIds.push(presence.id);
    const completed = await transitionWorkInstance({ id: authorizedUserId }, {
      ...scope,
      instanceId: instance.id,
      state: "COMPLETED",
    });
    expect(completed.state).toBe("COMPLETED");
  });

  it("does not require presence when evidence is not required", async () => {
    const definition = await createDefinition("OPTIONAL");
    const instance = await createInstance(definition.id, locationId);
    await transitionWorkInstance({ id: authorizedUserId }, {
      ...scope,
      instanceId: instance.id,
      state: "ACKNOWLEDGED",
    });
    const completed = await transitionWorkInstance({ id: authorizedUserId }, {
      ...scope,
      instanceId: instance.id,
      state: "COMPLETED",
    });
    expect(completed.state).toBe("COMPLETED");
  });

  it("uses the instance snapshot after the live definition starts requiring evidence", async () => {
    const definition = await createDefinition("SNAP");
    const instance = await createInstance(definition.id, locationId);
    await db.update(workSituationDefinitions).set({
      evidenceConfig: { isRequired: true },
    }).where(eq(workSituationDefinitions.id, definition.id));
    await db.update(workSituationEvidenceRequirements).set({ isRequired: true }).where(
      eq(workSituationEvidenceRequirements.workSituationDefinitionId, definition.id),
    );
    await transitionWorkInstance({ id: authorizedUserId }, {
      ...scope,
      instanceId: instance.id,
      state: "ACKNOWLEDGED",
    });
    const completed = await transitionWorkInstance({ id: authorizedUserId }, {
      ...scope,
      instanceId: instance.id,
      state: "COMPLETED",
    });
    expect(completed.state).toBe("COMPLETED");
    expect(completed.definitionSnapshot).toMatchObject({ evidenceRequired: false });
  });

  it("does not let one instance presence satisfy another instance", async () => {
    const definition = await createDefinition("ISOLATE", { evidenceRequired: true });
    const first = await createInstance(definition.id, locationId);
    const second = await createInstance(definition.id, locationId);
    const presence = await createWorkInstanceEvidencePresence({ id: authorizedUserId }, {
      ...scope,
      workInstanceId: first.id,
    });
    createdPresenceIds.push(presence.id);
    await transitionWorkInstance({ id: authorizedUserId }, {
      ...scope,
      instanceId: second.id,
      state: "ACKNOWLEDGED",
    });
    await expect(transitionWorkInstance({ id: authorizedUserId }, {
      ...scope,
      instanceId: second.id,
      state: "COMPLETED",
    })).rejects.toMatchObject({ code: "PREREQUISITE_NOT_SATISFIED" });
  });

  it("keeps the verification gate fail-closed and unchanged", async () => {
    const definition = await createDefinition("VERIF", { verificationRequired: true });
    const instance = await createInstance(definition.id, locationId);
    await transitionWorkInstance({ id: authorizedUserId }, {
      ...scope,
      instanceId: instance.id,
      state: "ACKNOWLEDGED",
    });
    await transitionWorkInstance({ id: authorizedUserId }, {
      ...scope,
      instanceId: instance.id,
      state: "COMPLETED",
    });
    await expect(transitionWorkInstance({ id: authorizedUserId }, {
      ...scope,
      instanceId: instance.id,
      state: "VERIFIED",
    })).rejects.toBeInstanceOf(RolesWorkServiceError);
    await expect(transitionWorkInstance({ id: authorizedUserId }, {
      ...scope,
      instanceId: instance.id,
      state: "VERIFIED",
    })).rejects.toMatchObject({
      code: "PREREQUISITE_NOT_SATISFIED",
      message: "Required verification cannot be satisfied because verification infrastructure is not implemented",
    });
  });
});
