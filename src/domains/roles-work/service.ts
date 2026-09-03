import { and, asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  businessRoles,
  roleChecklistItems,
  roleChecklists,
  roleKpiDefinitions,
  roleResponsibilities,
  workSituationDefinitions,
  workSituationEvidenceRequirements,
  workSituationReminderEscalationStages,
} from "@/db/schema";
import { authorizeEmployeeOperation } from "@/lib/authorization";
import { employeePermissions } from "@/lib/authorization-policy";

const scopeSchema = z.object({
  organizationId: z.string().uuid(),
  locationId: z.string().uuid(),
});

const roleInputSchema = scopeSchema.extend({
  identifier: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(200),
  purpose: z.string().trim().min(1).max(2000),
  responsibilities: z.array(z.object({
    responsibility: z.string().trim().min(1).max(2000),
    actualWork: z.string().trim().min(1).max(4000),
    position: z.number().int(),
  })).default([]),
  kpis: z.array(z.object({
    name: z.string().trim().min(1).max(200),
    description: z.string().trim().min(1).max(2000),
  })).default([]),
  checklists: z.array(z.object({
    name: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2000).nullable().optional(),
    items: z.array(z.object({
      definition: z.string().trim().min(1).max(2000),
      position: z.number().int(),
    })).default([]),
  })).default([]),
}).strict();

const workDefinitionInputSchema = scopeSchema.extend({
  triggerCategory: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().min(1).max(4000),
  severity: z.string().trim().min(1).max(100).nullable().optional(),
  evidenceRequired: z.boolean().default(false),
  verificationRequired: z.boolean().default(false),
  reminderEscalationStages: z.array(z.object({
    stage: z.string().trim().min(1).max(100),
    position: z.number().int(),
  })).default([]),
}).strict();

export type CreateRoleDefinitionInput = z.infer<typeof roleInputSchema>;
export type CreateWorkSituationDefinitionInput = z.infer<typeof workDefinitionInputSchema>;
type Actor = { id: string } | null;

export class RolesWorkServiceError extends Error {
  constructor(
    message: string,
    public readonly code: "AUTHENTICATION_REQUIRED" | "ACCESS_DENIED" | "INVALID_INPUT" | "NOT_FOUND" | "DUPLICATE_RECORD",
  ) {
    super(message);
    this.name = "RolesWorkServiceError";
  }
}

function requireActor(actor: Actor): asserts actor is { id: string } {
  if (!actor) throw new RolesWorkServiceError("Authentication required", "AUTHENTICATION_REQUIRED");
}

async function requireScopeAccess(
  actor: { id: string },
  scope: z.infer<typeof scopeSchema>,
  permission: "employee:read" | "employee:create",
) {
  const allowed = await authorizeEmployeeOperation({ userId: actor.id, ...scope, permission });
  if (!allowed) throw new RolesWorkServiceError("Access denied", "ACCESS_DENIED");
}

function validateDistinctPositions(records: Array<{ position: number }>) {
  if (new Set(records.map((record) => record.position)).size !== records.length) {
    throw new RolesWorkServiceError("Positions must be unique within their definition", "INVALID_INPUT");
  }
}

async function roleDetail(roleId: string, organizationId: string) {
  const [role] = await db.select().from(businessRoles).where(and(eq(businessRoles.id, roleId), eq(businessRoles.organizationId, organizationId)));
  if (!role) return null;
  const [responsibilities, kpis, checklists] = await Promise.all([
    db.select().from(roleResponsibilities).where(and(eq(roleResponsibilities.roleId, roleId), eq(roleResponsibilities.organizationId, organizationId))).orderBy(asc(roleResponsibilities.position)),
    db.select().from(roleKpiDefinitions).where(and(eq(roleKpiDefinitions.roleId, roleId), eq(roleKpiDefinitions.organizationId, organizationId))).orderBy(asc(roleKpiDefinitions.name)),
    db.select().from(roleChecklists).where(and(eq(roleChecklists.roleId, roleId), eq(roleChecklists.organizationId, organizationId))).orderBy(asc(roleChecklists.name)),
  ]);
  const checklistIds = checklists.map((checklist) => checklist.id);
  const items = checklistIds.length === 0 ? [] : await db.select().from(roleChecklistItems).where(and(eq(roleChecklistItems.organizationId, organizationId), inArray(roleChecklistItems.checklistId, checklistIds))).orderBy(asc(roleChecklistItems.position));
  return { ...role, responsibilities, kpis, checklists: checklists.map((checklist) => ({ ...checklist, items: items.filter((item) => item.checklistId === checklist.id) })) };
}

export async function createRoleDefinition(actor: Actor, input: CreateRoleDefinitionInput) {
  requireActor(actor);
  const parsed = roleInputSchema.safeParse(input);
  if (!parsed.success) throw new RolesWorkServiceError("Invalid role definition input", "INVALID_INPUT");
  validateDistinctPositions(parsed.data.responsibilities);
  for (const checklist of parsed.data.checklists) validateDistinctPositions(checklist.items);
  await requireScopeAccess(actor, parsed.data, employeePermissions.create);
  try {
    const roleId = await db.transaction(async (tx) => {
      const [role] = await tx.insert(businessRoles).values({ organizationId: parsed.data.organizationId, identifier: parsed.data.identifier, name: parsed.data.name, purpose: parsed.data.purpose }).returning({ id: businessRoles.id });
      if (parsed.data.responsibilities.length) await tx.insert(roleResponsibilities).values(parsed.data.responsibilities.map((item) => ({ ...item, organizationId: parsed.data.organizationId, roleId: role.id })));
      if (parsed.data.kpis.length) await tx.insert(roleKpiDefinitions).values(parsed.data.kpis.map((item) => ({ ...item, organizationId: parsed.data.organizationId, roleId: role.id })));
      for (const checklist of parsed.data.checklists) {
        const [createdChecklist] = await tx.insert(roleChecklists).values({ organizationId: parsed.data.organizationId, roleId: role.id, name: checklist.name, description: checklist.description ?? null }).returning({ id: roleChecklists.id });
        if (checklist.items.length) await tx.insert(roleChecklistItems).values(checklist.items.map((item) => ({ ...item, organizationId: parsed.data.organizationId, checklistId: createdChecklist.id })));
      }
      return role.id;
    });
    return roleDetail(roleId, parsed.data.organizationId);
  } catch (error) {
    const databaseError = error as { code?: string; cause?: { code?: string } };
    if (databaseError.code === "23505" || databaseError.cause?.code === "23505") throw new RolesWorkServiceError("Role identifier or name already exists in organization", "DUPLICATE_RECORD");
    throw error;
  }
}

export async function getRoleDefinition(actor: Actor, scope: z.infer<typeof scopeSchema>, roleId: string) {
  requireActor(actor);
  if (!scopeSchema.safeParse(scope).success || !z.string().uuid().safeParse(roleId).success) throw new RolesWorkServiceError("Invalid role definition request", "INVALID_INPUT");
  await requireScopeAccess(actor, scope, employeePermissions.read);
  const role = await roleDetail(roleId, scope.organizationId);
  if (!role) throw new RolesWorkServiceError("Role definition not found", "NOT_FOUND");
  return role;
}

export async function listRoleDefinitions(actor: Actor, scope: z.infer<typeof scopeSchema>) {
  requireActor(actor);
  if (!scopeSchema.safeParse(scope).success) throw new RolesWorkServiceError("Invalid role definition scope", "INVALID_INPUT");
  await requireScopeAccess(actor, scope, employeePermissions.read);
  return db.select().from(businessRoles).where(eq(businessRoles.organizationId, scope.organizationId)).orderBy(asc(businessRoles.name));
}

export async function createWorkSituationDefinition(actor: Actor, input: CreateWorkSituationDefinitionInput) {
  requireActor(actor);
  const parsed = workDefinitionInputSchema.safeParse(input);
  if (!parsed.success) throw new RolesWorkServiceError("Invalid work definition input", "INVALID_INPUT");
  validateDistinctPositions(parsed.data.reminderEscalationStages);
  await requireScopeAccess(actor, parsed.data, employeePermissions.create);
  const definitionId = await db.transaction(async (tx) => {
    const [definition] = await tx.insert(workSituationDefinitions).values({ organizationId: parsed.data.organizationId, triggerCategory: parsed.data.triggerCategory, title: parsed.data.title, description: parsed.data.description, severity: parsed.data.severity ?? null, verificationConfig: { isRequired: parsed.data.verificationRequired }, evidenceConfig: { isRequired: parsed.data.evidenceRequired } }).returning({ id: workSituationDefinitions.id });
    await tx.insert(workSituationEvidenceRequirements).values({ organizationId: parsed.data.organizationId, workSituationDefinitionId: definition.id, isRequired: parsed.data.evidenceRequired });
    if (parsed.data.reminderEscalationStages.length) await tx.insert(workSituationReminderEscalationStages).values(parsed.data.reminderEscalationStages.map((item) => ({ ...item, organizationId: parsed.data.organizationId, workSituationDefinitionId: definition.id })));
    return definition.id;
  });
  return getWorkSituationDefinition(actor, parsed.data, definitionId, employeePermissions.create);
}

async function getWorkSituationDefinition(actor: { id: string }, scope: z.infer<typeof scopeSchema>, definitionId: string, permission: "employee:read" | "employee:create" = employeePermissions.read) {
  await requireScopeAccess(actor, scope, permission);
  const [definition] = await db.select().from(workSituationDefinitions).where(and(eq(workSituationDefinitions.id, definitionId), eq(workSituationDefinitions.organizationId, scope.organizationId)));
  if (!definition) throw new RolesWorkServiceError("Work definition not found", "NOT_FOUND");
  const [evidenceRequirements, reminderEscalationStages] = await Promise.all([
    db.select().from(workSituationEvidenceRequirements).where(and(eq(workSituationEvidenceRequirements.workSituationDefinitionId, definitionId), eq(workSituationEvidenceRequirements.organizationId, scope.organizationId))),
    db.select().from(workSituationReminderEscalationStages).where(and(eq(workSituationReminderEscalationStages.workSituationDefinitionId, definitionId), eq(workSituationReminderEscalationStages.organizationId, scope.organizationId))).orderBy(asc(workSituationReminderEscalationStages.position)),
  ]);
  return { ...definition, evidenceRequirements, reminderEscalationStages };
}

export async function getWorkSituationDefinitionForScope(actor: Actor, scope: z.infer<typeof scopeSchema>, definitionId: string) {
  requireActor(actor);
  if (!scopeSchema.safeParse(scope).success || !z.string().uuid().safeParse(definitionId).success) throw new RolesWorkServiceError("Invalid work definition request", "INVALID_INPUT");
  return getWorkSituationDefinition(actor, scope, definitionId);
}

export async function listWorkSituationDefinitions(actor: Actor, scope: z.infer<typeof scopeSchema>) {
  requireActor(actor);
  if (!scopeSchema.safeParse(scope).success) throw new RolesWorkServiceError("Invalid work definition scope", "INVALID_INPUT");
  await requireScopeAccess(actor, scope, employeePermissions.read);
  return db.select().from(workSituationDefinitions).where(eq(workSituationDefinitions.organizationId, scope.organizationId)).orderBy(asc(workSituationDefinitions.title));
}
