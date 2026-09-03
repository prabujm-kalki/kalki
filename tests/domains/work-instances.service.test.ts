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
  workInstances,
  workSituationDefinitions,
  workSituationEvidenceRequirements,
  workSituationReminderEscalationStages,
} from "@/db/schema";
import {
  createWorkInstance,
  createWorkSituationDefinition,
  getWorkInstance,
  getWorkSituationDefinitionForScope,
  listWorkInstances,
  RolesWorkServiceError,
  transitionWorkInstance,
} from "@/domains/roles-work/service";
import { employeePermissions } from "@/lib/authorization-policy";

const organizationId = randomUUID();
const otherOrganizationId = randomUUID();
const locationId = randomUUID();
const sameOrgOtherLocationId = randomUUID();
const otherOrgLocationId = randomUUID();
const authorizedUserId = `work-instance-authorized-${randomUUID()}`;
const deniedUserId = `work-instance-denied-${randomUUID()}`;
const authorizationRoleId = randomUUID();
const personId = randomUUID();
const otherLocationPersonId = randomUUID();
const otherOrgPersonId = randomUUID();
const employeeId = randomUUID();
const otherLocationEmployeeId = randomUUID();
const otherOrgEmployeeId = randomUUID();
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

async function createDefinition(overrides: {
  identifierSuffix: string;
  evidenceRequired?: boolean;
  verificationRequired?: boolean;
}) {
  const definition = await createWorkSituationDefinition({ id: authorizedUserId }, {
    ...scope,
    triggerCategory: "routine",
    title: `Work ${overrides.identifierSuffix}`,
    description: `Definition ${overrides.identifierSuffix}`,
    evidenceRequired: overrides.evidenceRequired ?? false,
    verificationRequired: overrides.verificationRequired ?? false,
  });
  createdDefinitionIds.push(definition.id);
  return definition;
}

beforeAll(async () => {
  await db.insert(organizations).values([
    { id: organizationId, name: "Work instance organization", code: `WI-${organizationId.slice(0, 8)}` },
    { id: otherOrganizationId, name: "Other work instance organization", code: `WI-${otherOrganizationId.slice(0, 8)}` },
  ]);
  await db.insert(locations).values([
    { id: locationId, organizationId, name: "Work instance location", code: "WI-LOC" },
    { id: sameOrgOtherLocationId, organizationId, name: "Same org other location", code: "WI-LOC-2" },
    { id: otherOrgLocationId, organizationId: otherOrganizationId, name: "Other org location", code: "WI-OTHER" },
  ]);
  await db.insert(people).values([
    { id: personId, firstName: "Assigned", displayName: "Assigned Worker" },
    { id: otherLocationPersonId, firstName: "OtherLoc", displayName: "Other Location Worker" },
    { id: otherOrgPersonId, firstName: "OtherOrg", displayName: "Other Org Worker" },
  ]);
  await db.insert(employees).values([
    { id: employeeId, personId, organizationId, locationId, employeeCode: "WI-EMP", employmentStartDate: "2026-09-03" },
    {
      id: otherLocationEmployeeId,
      personId: otherLocationPersonId,
      organizationId,
      locationId: sameOrgOtherLocationId,
      employeeCode: "WI-EMP-2",
      employmentStartDate: "2026-09-03",
    },
    {
      id: otherOrgEmployeeId,
      personId: otherOrgPersonId,
      organizationId: otherOrganizationId,
      locationId: otherOrgLocationId,
      employeeCode: "WI-OTHER",
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
    code: `WI-ADMIN-${authorizationRoleId.slice(0, 8)}`,
    name: "Work instance administrator",
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
  await db.delete(employees).where(eq(employees.id, employeeId));
  await db.delete(employees).where(eq(employees.id, otherLocationEmployeeId));
  await db.delete(employees).where(eq(employees.id, otherOrgEmployeeId));
  await db.delete(people).where(eq(people.id, personId));
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

describe("Work/Situation instance foundation", () => {
  it("rejects unauthenticated and unauthorized instance operations", async () => {
    await expect(createWorkInstance(null, {
      ...scope,
      workSituationDefinitionId: randomUUID(),
    })).rejects.toMatchObject({ code: "AUTHENTICATION_REQUIRED" });
    await expect(listWorkInstances({ id: deniedUserId }, scope)).rejects.toMatchObject({ code: "ACCESS_DENIED" });
  });

  it("creates a scoped instance with optional assignment and an immutable definition snapshot", async () => {
    const definition = await createDefinition({ identifierSuffix: "SNAP" });
    const instance = await createWorkInstance({ id: authorizedUserId }, {
      ...scope,
      workSituationDefinitionId: definition.id,
      instanceLocationId: locationId,
      assignedEmployeeId: employeeId,
      sourceReference: "manual-create",
    });
    createdInstanceIds.push(instance.id);
    expect(instance).toMatchObject({
      organizationId,
      locationId,
      assignedEmployeeId: employeeId,
      state: "SEEN",
      sourceReference: "manual-create",
    });
    expect(instance.definitionSnapshot).toMatchObject({
      workSituationDefinitionId: definition.id,
      title: "Work SNAP",
      evidenceRequired: false,
      verificationRequired: false,
    });

    await db.update(workSituationDefinitions).set({ title: "Changed later" }).where(eq(workSituationDefinitions.id, definition.id));
    const reread = await getWorkInstance({ id: authorizedUserId }, scope, instance.id);
    expect(reread.definitionSnapshot).toMatchObject({ title: "Work SNAP" });
    const [liveDefinition] = await db.select().from(workSituationDefinitions).where(eq(workSituationDefinitions.id, definition.id));
    expect(liveDefinition.title).toBe("Changed later");
  });

  it("lists and retrieves instances with organization and location isolation", async () => {
    const definition = await createDefinition({ identifierSuffix: "SCOPE" });
    const located = await createWorkInstance({ id: authorizedUserId }, {
      ...scope,
      workSituationDefinitionId: definition.id,
      instanceLocationId: locationId,
    });
    const unlocated = await createWorkInstance({ id: authorizedUserId }, {
      ...scope,
      workSituationDefinitionId: definition.id,
    });
    createdInstanceIds.push(located.id, unlocated.id);

    const listed = await listWorkInstances({ id: authorizedUserId }, scope);
    expect(listed.map((item) => item.id)).toEqual(expect.arrayContaining([located.id, unlocated.id]));
    await expect(getWorkInstance({ id: authorizedUserId }, {
      organizationId,
      locationId: sameOrgOtherLocationId,
    }, located.id)).rejects.toMatchObject({ code: "ACCESS_DENIED" });
    await expect(getWorkInstance({ id: authorizedUserId }, otherOrgScope, located.id)).rejects.toMatchObject({
      code: "ACCESS_DENIED",
    });
    await expect(createWorkInstance({ id: authorizedUserId }, {
      ...otherOrgScope,
      workSituationDefinitionId: definition.id,
    })).rejects.toMatchObject({ code: "ACCESS_DENIED" });
    await expect(createWorkInstance({ id: authorizedUserId }, {
      ...scope,
      workSituationDefinitionId: definition.id,
      instanceLocationId: sameOrgOtherLocationId,
    })).rejects.toMatchObject({ code: "ACCESS_DENIED" });
  });

  it("validates employee assignment against organization and location scope", async () => {
    const definition = await createDefinition({ identifierSuffix: "ASSIGN" });
    await expect(createWorkInstance({ id: authorizedUserId }, {
      ...scope,
      workSituationDefinitionId: definition.id,
      instanceLocationId: locationId,
      assignedEmployeeId: otherLocationEmployeeId,
    })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(createWorkInstance({ id: authorizedUserId }, {
      ...scope,
      workSituationDefinitionId: definition.id,
      assignedEmployeeId: otherOrgEmployeeId,
    })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("assigns new instances only to active employees and does not rewrite existing assigned work after deactivation", async () => {
    const definition = await createDefinition({ identifierSuffix: "EMPACTIVE" });
    const instance = await createWorkInstance({ id: authorizedUserId }, {
      ...scope,
      workSituationDefinitionId: definition.id,
      instanceLocationId: locationId,
      assignedEmployeeId: employeeId,
    });
    createdInstanceIds.push(instance.id);
    expect(instance.assignedEmployeeId).toBe(employeeId);

    await db.update(employees).set({ isActive: false }).where(eq(employees.id, employeeId));

    await expect(createWorkInstance({ id: authorizedUserId }, {
      ...scope,
      workSituationDefinitionId: definition.id,
      instanceLocationId: locationId,
      assignedEmployeeId: employeeId,
    })).rejects.toMatchObject({
      code: "PREREQUISITE_NOT_SATISFIED",
      message: "Assigned employee is not active",
    });

    const unassigned = await createWorkInstance({ id: authorizedUserId }, {
      ...scope,
      workSituationDefinitionId: definition.id,
      instanceLocationId: locationId,
    });
    createdInstanceIds.push(unassigned.id);
    expect(unassigned.assignedEmployeeId).toBeNull();

    const acknowledged = await transitionWorkInstance({ id: authorizedUserId }, {
      ...scope,
      instanceId: instance.id,
      state: "ACKNOWLEDGED",
    });
    expect(acknowledged.state).toBe("ACKNOWLEDGED");
    expect(acknowledged.assignedEmployeeId).toBe(employeeId);
    expect(acknowledged.definitionSnapshot).toEqual(instance.definitionSnapshot);

    await db.update(employees).set({ isActive: true }).where(eq(employees.id, employeeId));
  });

  it("allows only SEEN to ACKNOWLEDGED to COMPLETED to VERIFIED", async () => {
    const definition = await createDefinition({ identifierSuffix: "LIFE" });
    const instance = await createWorkInstance({ id: authorizedUserId }, {
      ...scope,
      workSituationDefinitionId: definition.id,
      instanceLocationId: locationId,
    });
    createdInstanceIds.push(instance.id);

    await expect(transitionWorkInstance({ id: authorizedUserId }, {
      ...scope,
      instanceId: instance.id,
      state: "COMPLETED",
    })).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    await expect(transitionWorkInstance({ id: authorizedUserId }, {
      ...scope,
      instanceId: instance.id,
      state: "VERIFIED",
    })).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    await expect(transitionWorkInstance({ id: authorizedUserId }, {
      ...scope,
      instanceId: instance.id,
      state: "SEEN",
    })).rejects.toMatchObject({ code: "INVALID_TRANSITION" });

    const acknowledged = await transitionWorkInstance({ id: authorizedUserId }, {
      ...scope,
      instanceId: instance.id,
      state: "ACKNOWLEDGED",
    });
    expect(acknowledged.state).toBe("ACKNOWLEDGED");
    expect(acknowledged.definitionSnapshot).toMatchObject({ title: "Work LIFE" });

    await expect(transitionWorkInstance({ id: authorizedUserId }, {
      ...scope,
      instanceId: instance.id,
      state: "SEEN",
    })).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    await expect(transitionWorkInstance({ id: authorizedUserId }, {
      ...scope,
      instanceId: instance.id,
      state: "VERIFIED",
    })).rejects.toMatchObject({ code: "INVALID_TRANSITION" });

    const completed = await transitionWorkInstance({ id: authorizedUserId }, {
      ...scope,
      instanceId: instance.id,
      state: "COMPLETED",
    });
    expect(completed.state).toBe("COMPLETED");

    await expect(transitionWorkInstance({ id: authorizedUserId }, {
      ...scope,
      instanceId: instance.id,
      state: "ACKNOWLEDGED",
    })).rejects.toMatchObject({ code: "INVALID_TRANSITION" });

    const verified = await transitionWorkInstance({ id: authorizedUserId }, {
      ...scope,
      instanceId: instance.id,
      state: "VERIFIED",
    });
    expect(verified.state).toBe("VERIFIED");
    await expect(transitionWorkInstance({ id: authorizedUserId }, {
      ...scope,
      instanceId: instance.id,
      state: "COMPLETED",
    })).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
  });

  it("fails safely when evidence or verification prerequisites are required but deferred", async () => {
    const evidenceDefinition = await createDefinition({ identifierSuffix: "EVID", evidenceRequired: true });
    const evidenceInstance = await createWorkInstance({ id: authorizedUserId }, {
      ...scope,
      workSituationDefinitionId: evidenceDefinition.id,
    });
    createdInstanceIds.push(evidenceInstance.id);
    await transitionWorkInstance({ id: authorizedUserId }, {
      ...scope,
      instanceId: evidenceInstance.id,
      state: "ACKNOWLEDGED",
    });
    await expect(transitionWorkInstance({ id: authorizedUserId }, {
      ...scope,
      instanceId: evidenceInstance.id,
      state: "COMPLETED",
    })).rejects.toBeInstanceOf(RolesWorkServiceError);
    await expect(transitionWorkInstance({ id: authorizedUserId }, {
      ...scope,
      instanceId: evidenceInstance.id,
      state: "COMPLETED",
    })).rejects.toMatchObject({
      code: "PREREQUISITE_NOT_SATISFIED",
      message: "Mandatory evidence cannot be satisfied because evidence presence is not recorded",
    });

    const verificationDefinition = await createDefinition({
      identifierSuffix: "VERIF",
      verificationRequired: true,
    });
    const verificationInstance = await createWorkInstance({ id: authorizedUserId }, {
      ...scope,
      workSituationDefinitionId: verificationDefinition.id,
    });
    createdInstanceIds.push(verificationInstance.id);
    await transitionWorkInstance({ id: authorizedUserId }, {
      ...scope,
      instanceId: verificationInstance.id,
      state: "ACKNOWLEDGED",
    });
    await transitionWorkInstance({ id: authorizedUserId }, {
      ...scope,
      instanceId: verificationInstance.id,
      state: "COMPLETED",
    });
    await expect(transitionWorkInstance({ id: authorizedUserId }, {
      ...scope,
      instanceId: verificationInstance.id,
      state: "VERIFIED",
    })).rejects.toMatchObject({
      code: "PREREQUISITE_NOT_SATISFIED",
      message: "Required verification cannot be satisfied because verification presence is not recorded",
    });
  });

  it("creates instances only from active definitions and does not rewrite existing instances after deactivation", async () => {
    const definition = await createDefinition({ identifierSuffix: "ACTIVE" });
    const instance = await createWorkInstance({ id: authorizedUserId }, {
      ...scope,
      workSituationDefinitionId: definition.id,
      instanceLocationId: locationId,
    });
    createdInstanceIds.push(instance.id);
    expect(instance.state).toBe("SEEN");

    await db.update(workSituationDefinitions).set({ isActive: false }).where(eq(workSituationDefinitions.id, definition.id));

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
  });

  it("persists create-time source metadata without rewriting it on later transitions", async () => {
    const definition = await createDefinition({ identifierSuffix: "SOURCE" });
    const sourceMetadata = {
      triggerCategory: "routine",
      origin: "manual-assignment",
    };
    const instance = await createWorkInstance({ id: authorizedUserId }, {
      ...scope,
      workSituationDefinitionId: definition.id,
      instanceLocationId: locationId,
      sourceReference: "opening-checklist",
      sourceMetadata,
    });
    createdInstanceIds.push(instance.id);
    expect(instance).toMatchObject({
      sourceReference: "opening-checklist",
      sourceMetadata,
    });

    const omitted = await createWorkInstance({ id: authorizedUserId }, {
      ...scope,
      workSituationDefinitionId: definition.id,
    });
    createdInstanceIds.push(omitted.id);
    expect(omitted.sourceMetadata).toEqual({});

    await expect(createWorkInstance({ id: authorizedUserId }, {
      ...scope,
      workSituationDefinitionId: definition.id,
      sourceMetadata: ["not-an-object"],
    } as never)).rejects.toMatchObject({ code: "INVALID_INPUT" });

    const acknowledged = await transitionWorkInstance({ id: authorizedUserId }, {
      ...scope,
      instanceId: instance.id,
      state: "ACKNOWLEDGED",
    });
    expect(acknowledged.sourceReference).toBe("opening-checklist");
    expect(acknowledged.sourceMetadata).toEqual(sourceMetadata);
    expect(acknowledged.definitionSnapshot).toEqual(instance.definitionSnapshot);
  });
});
