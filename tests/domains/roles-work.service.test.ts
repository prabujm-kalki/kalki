import "dotenv/config";
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import {
  authUsers, businessRoles, locationMemberships, locationRoleAssignments, locations,
  organizationMemberships, organizations, permissions, roleChecklistItems, roleChecklists,
  roleKpiDefinitions, rolePermissions, roleResponsibilities, roles,
  workSituationDefinitions, workSituationEvidenceRequirements, workSituationReminderEscalationStages,
} from "@/db/schema";
import {
  createRoleDefinition, createWorkSituationDefinition, getRoleDefinition,
  getWorkSituationDefinitionForScope, listRoleDefinitions, RolesWorkServiceError,
} from "@/domains/roles-work/service";
import { employeePermissions } from "@/lib/authorization-policy";

const organizationId = randomUUID();
const otherOrganizationId = randomUUID();
const locationId = randomUUID();
const otherLocationId = randomUUID();
const authorizedUserId = `roles-work-authorized-${randomUUID()}`;
const deniedUserId = `roles-work-denied-${randomUUID()}`;
const authorizationRoleId = randomUUID();
const createdRoleIds: string[] = [];
const createdDefinitionIds: string[] = [];
const createdPermissionIds: string[] = [];
const scope = { organizationId, locationId };

async function insertUser(id: string) {
  await db.insert(authUsers).values({ id, name: id, email: `${id}@example.invalid`, emailVerified: true, createdAt: new Date(), updatedAt: new Date() });
}

beforeAll(async () => {
  await db.insert(organizations).values([
    { id: organizationId, name: "Roles work organization", code: `RW-${organizationId.slice(0, 8)}` },
    { id: otherOrganizationId, name: "Other roles work organization", code: `RW-${otherOrganizationId.slice(0, 8)}` },
  ]);
  await db.insert(locations).values([
    { id: locationId, organizationId, name: "Roles work location", code: "RW-LOC" },
    { id: otherLocationId, organizationId: otherOrganizationId, name: "Other roles work location", code: "RW-OTHER" },
  ]);
  await Promise.all([insertUser(authorizedUserId), insertUser(deniedUserId)]);
  const existing = await db.select({ id: permissions.id, code: permissions.code }).from(permissions).where(inArray(permissions.code, [employeePermissions.read, employeePermissions.create]));
  const missing = [employeePermissions.read, employeePermissions.create].filter((code) => !existing.some((permission) => permission.code === code));
  if (missing.length) {
    const created = await db
      .insert(permissions)
      .values(missing.map((code) => ({ code, name: code })))
      .returning({ id: permissions.id });
    createdPermissionIds.push(...created.map((permission) => permission.id));
  }
  const allPermissions = await db.select({ id: permissions.id, code: permissions.code }).from(permissions).where(inArray(permissions.code, [employeePermissions.read, employeePermissions.create]));
  await db.insert(roles).values({ id: authorizationRoleId, code: `RW-ADMIN-${authorizationRoleId.slice(0, 8)}`, name: "Roles work administrator" });
  await db.insert(rolePermissions).values(allPermissions.map((permission) => ({ roleId: authorizationRoleId, permissionId: permission.id })));
  await db.insert(organizationMemberships).values([{ userId: authorizedUserId, organizationId }, { userId: deniedUserId, organizationId }]);
  await db.insert(locationMemberships).values({ userId: authorizedUserId, organizationId, locationId });
  await db.insert(locationRoleAssignments).values({ userId: authorizedUserId, organizationId, locationId, roleId: authorizationRoleId });
});

afterAll(async () => {
  for (const definitionId of createdDefinitionIds) {
    await db.delete(workSituationReminderEscalationStages).where(eq(workSituationReminderEscalationStages.workSituationDefinitionId, definitionId));
    await db.delete(workSituationEvidenceRequirements).where(eq(workSituationEvidenceRequirements.workSituationDefinitionId, definitionId));
    await db.delete(workSituationDefinitions).where(eq(workSituationDefinitions.id, definitionId));
  }
  for (const roleId of createdRoleIds) {
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
  await db.delete(authUsers).where(eq(authUsers.id, authorizedUserId));
  await db.delete(authUsers).where(eq(authUsers.id, deniedUserId));
  await db.delete(locations).where(eq(locations.id, locationId));
  await db.delete(locations).where(eq(locations.id, otherLocationId));
  await db.delete(organizations).where(eq(organizations.id, organizationId));
  await db.delete(organizations).where(eq(organizations.id, otherOrganizationId));
});

describe("Role and Work/Situation configuration services", () => {
  it("creates and retrieves a role baseline with ordered children", async () => {
    const role = await createRoleDefinition({ id: authorizedUserId }, {
      ...scope, identifier: "OPS", name: "Operations", purpose: "Coordinate operations",
      responsibilities: [{ responsibility: "Own opening", actualWork: "Prepare site", position: 10 }],
      kpis: [{ name: "Quality", description: "Quality definition" }],
      checklists: [{ name: "Opening", items: [{ definition: "Review readiness", position: 10 }] }],
    });
    expect(role).not.toBeNull();
    createdRoleIds.push(role!.id);
    expect(role).toMatchObject({ identifier: "OPS", responsibilities: [{ position: 10 }], kpis: [{ name: "Quality" }], checklists: [{ items: [{ position: 10 }] }] });
    await expect(createRoleDefinition({ id: authorizedUserId }, { ...scope, identifier: "OPS", name: "Other", purpose: "Duplicate" })).rejects.toMatchObject({ code: "DUPLICATE_RECORD" });
  });

  it("enforces authorization and organization scope for role definitions", async () => {
    const role = await createRoleDefinition({ id: authorizedUserId }, { ...scope, identifier: "SCOPE", name: "Scope", purpose: "Scope role" });
    createdRoleIds.push(role!.id);
    await expect(listRoleDefinitions({ id: deniedUserId }, scope)).rejects.toMatchObject({ code: "ACCESS_DENIED" });
    await expect(getRoleDefinition({ id: authorizedUserId }, { organizationId: otherOrganizationId, locationId: otherLocationId }, role!.id)).rejects.toMatchObject({ code: "ACCESS_DENIED" });
  });

  it("creates a scoped Work/Situation definition with evidence and ordered stages", async () => {
    const definition = await createWorkSituationDefinition({ id: authorizedUserId }, {
      ...scope, triggerCategory: "routine", title: "Open site", description: "Opening work",
      evidenceRequired: true, verificationRequired: true,
      reminderEscalationStages: [{ stage: "due_notification", position: 10 }, { stage: "reminder", position: 20 }],
    });
    createdDefinitionIds.push(definition.id);
    expect(definition).toMatchObject({ evidenceRequirements: [{ isRequired: true }], reminderEscalationStages: [{ stage: "due_notification", position: 10 }, { stage: "reminder", position: 20 }] });
    await expect(getWorkSituationDefinitionForScope({ id: authorizedUserId }, { organizationId: otherOrganizationId, locationId: otherLocationId }, definition.id)).rejects.toMatchObject({ code: "ACCESS_DENIED" });
  });

  it("rejects invalid ordered configuration and unauthenticated access", async () => {
    await expect(createWorkSituationDefinition({ id: authorizedUserId }, { ...scope, triggerCategory: "routine", title: "Invalid", description: "Invalid", reminderEscalationStages: [{ stage: "one", position: 10 }, { stage: "two", position: 10 }] })).rejects.toMatchObject({ code: "INVALID_INPUT" });
    await expect(createRoleDefinition(null, { ...scope, identifier: "NONE", name: "None", purpose: "No actor" })).rejects.toBeInstanceOf(RolesWorkServiceError);
  });

  it("accepts only the approved reminder and escalation sequence", async () => {
    const definition = await createWorkSituationDefinition({ id: authorizedUserId }, {
      ...scope,
      triggerCategory: "routine",
      title: "Framework stages",
      description: "Framework stages",
      reminderEscalationStages: [
        { stage: "due_notification", position: 10 },
        { stage: "strong_reminder", position: 20 },
        { stage: "verification", position: 30 },
        { stage: "exception_escalation", position: 40 },
      ],
    });
    createdDefinitionIds.push(definition.id);
    expect(definition.reminderEscalationStages.map((stage) => stage.stage)).toEqual([
      "due_notification",
      "strong_reminder",
      "verification",
      "exception_escalation",
    ]);
    await expect(createWorkSituationDefinition({ id: authorizedUserId }, {
      ...scope,
      triggerCategory: "routine",
      title: "Unknown stage",
      description: "Unknown stage",
      reminderEscalationStages: [{ stage: "ad-hoc", position: 10 }] as never,
    })).rejects.toMatchObject({ code: "INVALID_INPUT" });
    await expect(createWorkSituationDefinition({ id: authorizedUserId }, {
      ...scope,
      triggerCategory: "routine",
      title: "Out of order",
      description: "Out of order",
      reminderEscalationStages: [
        { stage: "escalation", position: 10 },
        { stage: "reminder", position: 20 },
      ],
    })).rejects.toMatchObject({
      code: "INVALID_INPUT",
      message: "Reminder stages must follow the approved reminder and escalation sequence",
    });
    await expect(createWorkSituationDefinition({ id: authorizedUserId }, {
      ...scope,
      triggerCategory: "routine",
      title: "Duplicate stage",
      description: "Duplicate stage",
      reminderEscalationStages: [
        { stage: "reminder", position: 10 },
        { stage: "reminder", position: 20 },
      ],
    })).rejects.toMatchObject({
      code: "INVALID_INPUT",
      message: "Reminder stages must be unique within their definition",
    });
  });

  it("accepts only the approved Work/Situation trigger categories", async () => {
    const eventBased = await createWorkSituationDefinition({ id: authorizedUserId }, {
      ...scope, triggerCategory: "event-based", title: "Event work", description: "Event-based work",
    });
    createdDefinitionIds.push(eventBased.id);
    const orderTriggered = await createWorkSituationDefinition({ id: authorizedUserId }, {
      ...scope, triggerCategory: "item/order-triggered", title: "Order work", description: "Item or order work",
    });
    createdDefinitionIds.push(orderTriggered.id);
    expect(eventBased.triggerCategory).toBe("event-based");
    expect(orderTriggered.triggerCategory).toBe("item/order-triggered");
    await expect(createWorkSituationDefinition({ id: authorizedUserId }, {
      ...scope, triggerCategory: "ad-hoc", title: "Invalid trigger", description: "Invalid trigger",
    })).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });
});
