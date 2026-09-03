import { and, asc, eq, inArray, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  businessRoles,
  employeeResponsibilityAdditions,
  employeeRoleAssignments,
  employees,
  locations,
  roleChecklistItems,
  roleChecklists,
  roleKpiDefinitions,
  roleResponsibilities,
  workInstances,
  workInstanceEvidencePresences,
  workInstanceVerificationPresences,
  workSituationDefinitions,
  workSituationEvidenceRequirements,
  workSituationReminderEscalationStages,
} from "@/db/schema";
import { authorizeEmployeeOperation } from "@/lib/authorization";
import {
  employeePermissions,
  type EmployeePermission,
} from "@/lib/authorization-policy";

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

const employeeScopeSchema = scopeSchema.extend({
  employeeId: z.string().uuid(),
}).strict();

const assignEmployeeRoleSchema = employeeScopeSchema.extend({
  roleId: z.string().uuid(),
}).strict();

const employeeResponsibilityAdditionSchema = employeeScopeSchema.extend({
  responsibility: z.string().trim().min(1).max(2000),
  actualWork: z.string().trim().min(1).max(4000),
  position: z.number().int(),
}).strict();

const workInstanceStates = ["SEEN", "ACKNOWLEDGED", "COMPLETED", "VERIFIED"] as const;
const workInstanceStateSchema = z.enum(workInstanceStates);
const allowedWorkInstanceTransitions: Record<
  (typeof workInstanceStates)[number],
  (typeof workInstanceStates)[number] | null
> = {
  SEEN: "ACKNOWLEDGED",
  ACKNOWLEDGED: "COMPLETED",
  COMPLETED: "VERIFIED",
  VERIFIED: null,
};

const createWorkInstanceSchema = scopeSchema.extend({
  workSituationDefinitionId: z.string().uuid(),
  instanceLocationId: z.string().uuid().nullable().optional(),
  assignedEmployeeId: z.string().uuid().nullable().optional(),
  sourceReference: z.string().trim().min(1).max(200).nullable().optional(),
}).strict();

const transitionWorkInstanceSchema = scopeSchema.extend({
  instanceId: z.string().uuid(),
  state: workInstanceStateSchema,
}).strict();

const workInstanceEvidencePresenceSchema = scopeSchema.extend({
  workInstanceId: z.string().uuid(),
}).strict();

const workInstanceVerificationPresenceSchema = scopeSchema.extend({
  workInstanceId: z.string().uuid(),
}).strict();

export type CreateRoleDefinitionInput = z.infer<typeof roleInputSchema>;
export type CreateWorkSituationDefinitionInput = z.infer<typeof workDefinitionInputSchema>;
export type AssignEmployeeRoleInput = z.infer<typeof assignEmployeeRoleSchema>;
export type CreateEmployeeResponsibilityAdditionInput = z.infer<typeof employeeResponsibilityAdditionSchema>;
export type CreateWorkInstanceInput = z.infer<typeof createWorkInstanceSchema>;
export type TransitionWorkInstanceInput = z.infer<typeof transitionWorkInstanceSchema>;
export type CreateWorkInstanceEvidencePresenceInput = z.infer<typeof workInstanceEvidencePresenceSchema>;
export type CreateWorkInstanceVerificationPresenceInput = z.infer<typeof workInstanceVerificationPresenceSchema>;
type Actor = { id: string } | null;

export class RolesWorkServiceError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "AUTHENTICATION_REQUIRED"
      | "ACCESS_DENIED"
      | "INVALID_INPUT"
      | "NOT_FOUND"
      | "DUPLICATE_RECORD"
      | "INVALID_TRANSITION"
      | "PREREQUISITE_NOT_SATISFIED",
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
  permission: EmployeePermission,
) {
  const allowed = await authorizeEmployeeOperation({ userId: actor.id, ...scope, permission });
  if (!allowed) throw new RolesWorkServiceError("Access denied", "ACCESS_DENIED");
}

function isUniqueViolation(error: unknown) {
  const databaseError = error as { code?: string; cause?: { code?: string } };
  return databaseError.code === "23505" || databaseError.cause?.code === "23505";
}

async function requireEmployeeInScope(scope: z.infer<typeof employeeScopeSchema>) {
  const [employee] = await db.select({
    id: employees.id,
    organizationId: employees.organizationId,
    locationId: employees.locationId,
  }).from(employees).where(and(
    eq(employees.id, scope.employeeId),
    eq(employees.organizationId, scope.organizationId),
    eq(employees.locationId, scope.locationId),
  ));
  if (!employee) throw new RolesWorkServiceError("Employee not found in organization location", "NOT_FOUND");
  return employee;
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
    if (isUniqueViolation(error)) throw new RolesWorkServiceError("Role identifier or name already exists in organization", "DUPLICATE_RECORD");
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

export async function assignEmployeeRole(actor: Actor, input: AssignEmployeeRoleInput) {
  requireActor(actor);
  const parsed = assignEmployeeRoleSchema.safeParse(input);
  if (!parsed.success) throw new RolesWorkServiceError("Invalid employee role assignment input", "INVALID_INPUT");
  await requireScopeAccess(actor, parsed.data, employeePermissions.create);
  await requireEmployeeInScope(parsed.data);
  const [role] = await db.select({ id: businessRoles.id }).from(businessRoles).where(and(
    eq(businessRoles.id, parsed.data.roleId),
    eq(businessRoles.organizationId, parsed.data.organizationId),
  ));
  if (!role) throw new RolesWorkServiceError("Role definition not found", "NOT_FOUND");
  try {
    const [assignment] = await db.insert(employeeRoleAssignments).values({
      organizationId: parsed.data.organizationId,
      employeeId: parsed.data.employeeId,
      roleId: parsed.data.roleId,
    }).returning();
    return assignment;
  } catch (error) {
    if (isUniqueViolation(error)) throw new RolesWorkServiceError("Employee already has this business role assignment", "DUPLICATE_RECORD");
    throw error;
  }
}

export async function getEmployeeRoleAssignment(actor: Actor, scope: z.infer<typeof employeeScopeSchema>, assignmentId: string) {
  requireActor(actor);
  if (!employeeScopeSchema.safeParse(scope).success || !z.string().uuid().safeParse(assignmentId).success) {
    throw new RolesWorkServiceError("Invalid employee role assignment request", "INVALID_INPUT");
  }
  await requireScopeAccess(actor, scope, employeePermissions.read);
  await requireEmployeeInScope(scope);
  const [assignment] = await db.select().from(employeeRoleAssignments).where(and(
    eq(employeeRoleAssignments.id, assignmentId),
    eq(employeeRoleAssignments.organizationId, scope.organizationId),
    eq(employeeRoleAssignments.employeeId, scope.employeeId),
  ));
  if (!assignment) throw new RolesWorkServiceError("Employee role assignment not found", "NOT_FOUND");
  return assignment;
}

export async function listEmployeeRoleAssignments(actor: Actor, scope: z.infer<typeof employeeScopeSchema>) {
  requireActor(actor);
  if (!employeeScopeSchema.safeParse(scope).success) throw new RolesWorkServiceError("Invalid employee role assignment scope", "INVALID_INPUT");
  await requireScopeAccess(actor, scope, employeePermissions.read);
  await requireEmployeeInScope(scope);
  return db.select().from(employeeRoleAssignments).where(and(
    eq(employeeRoleAssignments.organizationId, scope.organizationId),
    eq(employeeRoleAssignments.employeeId, scope.employeeId),
  )).orderBy(asc(employeeRoleAssignments.createdAt));
}

export async function createEmployeeResponsibilityAddition(actor: Actor, input: CreateEmployeeResponsibilityAdditionInput) {
  requireActor(actor);
  const parsed = employeeResponsibilityAdditionSchema.safeParse(input);
  if (!parsed.success) throw new RolesWorkServiceError("Invalid employee responsibility addition input", "INVALID_INPUT");
  await requireScopeAccess(actor, parsed.data, employeePermissions.create);
  await requireEmployeeInScope(parsed.data);
  try {
    const [addition] = await db.insert(employeeResponsibilityAdditions).values({
      organizationId: parsed.data.organizationId,
      employeeId: parsed.data.employeeId,
      responsibility: parsed.data.responsibility,
      actualWork: parsed.data.actualWork,
      position: parsed.data.position,
    }).returning();
    return addition;
  } catch (error) {
    if (isUniqueViolation(error)) throw new RolesWorkServiceError("Employee addition position already exists", "DUPLICATE_RECORD");
    throw error;
  }
}

export async function getEmployeeResponsibilityAddition(actor: Actor, scope: z.infer<typeof employeeScopeSchema>, additionId: string) {
  requireActor(actor);
  if (!employeeScopeSchema.safeParse(scope).success || !z.string().uuid().safeParse(additionId).success) {
    throw new RolesWorkServiceError("Invalid employee responsibility addition request", "INVALID_INPUT");
  }
  await requireScopeAccess(actor, scope, employeePermissions.read);
  await requireEmployeeInScope(scope);
  const [addition] = await db.select().from(employeeResponsibilityAdditions).where(and(
    eq(employeeResponsibilityAdditions.id, additionId),
    eq(employeeResponsibilityAdditions.organizationId, scope.organizationId),
    eq(employeeResponsibilityAdditions.employeeId, scope.employeeId),
  ));
  if (!addition) throw new RolesWorkServiceError("Employee responsibility addition not found", "NOT_FOUND");
  return addition;
}

export async function listEmployeeResponsibilityAdditions(actor: Actor, scope: z.infer<typeof employeeScopeSchema>) {
  requireActor(actor);
  if (!employeeScopeSchema.safeParse(scope).success) throw new RolesWorkServiceError("Invalid employee responsibility addition scope", "INVALID_INPUT");
  await requireScopeAccess(actor, scope, employeePermissions.read);
  await requireEmployeeInScope(scope);
  return db.select().from(employeeResponsibilityAdditions).where(and(
    eq(employeeResponsibilityAdditions.organizationId, scope.organizationId),
    eq(employeeResponsibilityAdditions.employeeId, scope.employeeId),
  )).orderBy(asc(employeeResponsibilityAdditions.position));
}

export async function getEffectiveEmployeeRole(actor: Actor, scope: z.infer<typeof employeeScopeSchema>) {
  requireActor(actor);
  if (!employeeScopeSchema.safeParse(scope).success) throw new RolesWorkServiceError("Invalid effective role request", "INVALID_INPUT");
  await requireScopeAccess(actor, scope, employeePermissions.read);
  const employee = await requireEmployeeInScope(scope);
  const assignments = await db.select().from(employeeRoleAssignments).where(and(
    eq(employeeRoleAssignments.organizationId, scope.organizationId),
    eq(employeeRoleAssignments.employeeId, scope.employeeId),
  )).orderBy(asc(employeeRoleAssignments.createdAt));
  const assignedRoles: Array<NonNullable<Awaited<ReturnType<typeof roleDetail>>>> = [];
  for (const assignment of assignments) {
    const role = await roleDetail(assignment.roleId, scope.organizationId);
    if (role) assignedRoles.push(role);
  }
  const additions = await db.select().from(employeeResponsibilityAdditions).where(and(
    eq(employeeResponsibilityAdditions.organizationId, scope.organizationId),
    eq(employeeResponsibilityAdditions.employeeId, scope.employeeId),
  )).orderBy(asc(employeeResponsibilityAdditions.position));
  return {
    employeeId: employee.id,
    organizationId: employee.organizationId,
    locationId: employee.locationId,
    assignments,
    assignedRoles,
    employeeResponsibilityAdditions: additions,
  };
}

function isRequiredFlag(value: unknown) {
  return typeof value === "object" && value !== null && "isRequired" in value && value.isRequired === true;
}

function workInstanceVisibleInScope(
  instance: { organizationId: string; locationId: string | null },
  scope: z.infer<typeof scopeSchema>,
) {
  if (instance.organizationId !== scope.organizationId) return false;
  return instance.locationId === null || instance.locationId === scope.locationId;
}

async function requireAssignedEmployee(input: {
  organizationId: string;
  assignedEmployeeId: string;
  instanceLocationId: string | null;
}) {
  const [employee] = await db.select({
    id: employees.id,
    organizationId: employees.organizationId,
    locationId: employees.locationId,
  }).from(employees).where(and(
    eq(employees.id, input.assignedEmployeeId),
    eq(employees.organizationId, input.organizationId),
  ));
  if (!employee) throw new RolesWorkServiceError("Employee not found in organization", "NOT_FOUND");
  if (input.instanceLocationId && employee.locationId !== input.instanceLocationId) {
    throw new RolesWorkServiceError("Employee is not in the instance location", "NOT_FOUND");
  }
  return employee;
}

async function loadDefinitionSnapshot(organizationId: string, definitionId: string) {
  const [definition] = await db.select().from(workSituationDefinitions).where(and(
    eq(workSituationDefinitions.id, definitionId),
    eq(workSituationDefinitions.organizationId, organizationId),
  ));
  if (!definition) throw new RolesWorkServiceError("Work definition not found", "NOT_FOUND");
  const [evidenceRequirement] = await db.select().from(workSituationEvidenceRequirements).where(and(
    eq(workSituationEvidenceRequirements.workSituationDefinitionId, definitionId),
    eq(workSituationEvidenceRequirements.organizationId, organizationId),
  ));
  const reminderEscalationStages = await db.select({
    stage: workSituationReminderEscalationStages.stage,
    position: workSituationReminderEscalationStages.position,
    configuration: workSituationReminderEscalationStages.configuration,
    isActive: workSituationReminderEscalationStages.isActive,
  }).from(workSituationReminderEscalationStages).where(and(
    eq(workSituationReminderEscalationStages.workSituationDefinitionId, definitionId),
    eq(workSituationReminderEscalationStages.organizationId, organizationId),
  )).orderBy(asc(workSituationReminderEscalationStages.position));
  return {
    workSituationDefinitionId: definition.id,
    triggerCategory: definition.triggerCategory,
    title: definition.title,
    description: definition.description,
    severity: definition.severity,
    verificationConfig: definition.verificationConfig,
    evidenceConfig: definition.evidenceConfig,
    metadata: definition.metadata,
    evidenceRequired: evidenceRequirement?.isRequired === true || isRequiredFlag(definition.evidenceConfig),
    verificationRequired: isRequiredFlag(definition.verificationConfig),
    reminderEscalationStages,
    capturedAt: new Date().toISOString(),
  };
}

function snapshotRequiresEvidence(snapshot: unknown) {
  if (typeof snapshot !== "object" || snapshot === null) return false;
  const record = snapshot as { evidenceRequired?: unknown; evidenceConfig?: unknown };
  return record.evidenceRequired === true || isRequiredFlag(record.evidenceConfig);
}

function snapshotRequiresVerification(snapshot: unknown, verificationConfig: unknown) {
  if (isRequiredFlag(verificationConfig)) return true;
  if (typeof snapshot !== "object" || snapshot === null) return false;
  const record = snapshot as { verificationRequired?: unknown; verificationConfig?: unknown };
  return record.verificationRequired === true || isRequiredFlag(record.verificationConfig);
}

async function getScopedWorkInstance(scope: z.infer<typeof scopeSchema>, instanceId: string) {
  const [instance] = await db.select().from(workInstances).where(and(
    eq(workInstances.id, instanceId),
    eq(workInstances.organizationId, scope.organizationId),
  ));
  if (!instance || !workInstanceVisibleInScope(instance, scope)) {
    throw new RolesWorkServiceError("Work instance not found", "NOT_FOUND");
  }
  return instance;
}

export async function createWorkInstance(actor: Actor, input: CreateWorkInstanceInput) {
  requireActor(actor);
  const parsed = createWorkInstanceSchema.safeParse(input);
  if (!parsed.success) throw new RolesWorkServiceError("Invalid work instance input", "INVALID_INPUT");
  await requireScopeAccess(actor, parsed.data, employeePermissions.create);
  const instanceLocationId = parsed.data.instanceLocationId === undefined ? null : parsed.data.instanceLocationId;
  if (instanceLocationId && instanceLocationId !== parsed.data.locationId) {
    throw new RolesWorkServiceError("Instance location must match the authorized location", "ACCESS_DENIED");
  }
  if (instanceLocationId) {
    const [location] = await db.select({ id: locations.id }).from(locations).where(and(
      eq(locations.id, instanceLocationId),
      eq(locations.organizationId, parsed.data.organizationId),
    ));
    if (!location) throw new RolesWorkServiceError("Location not found in organization", "NOT_FOUND");
  }
  if (parsed.data.assignedEmployeeId) {
    await requireAssignedEmployee({
      organizationId: parsed.data.organizationId,
      assignedEmployeeId: parsed.data.assignedEmployeeId,
      instanceLocationId,
    });
  }
  const definitionSnapshot = await loadDefinitionSnapshot(
    parsed.data.organizationId,
    parsed.data.workSituationDefinitionId,
  );
  const [instance] = await db.insert(workInstances).values({
    organizationId: parsed.data.organizationId,
    workSituationDefinitionId: parsed.data.workSituationDefinitionId,
    locationId: instanceLocationId,
    assignedEmployeeId: parsed.data.assignedEmployeeId ?? null,
    sourceReference: parsed.data.sourceReference ?? null,
    definitionSnapshot,
    state: "SEEN",
    verificationConfig: definitionSnapshot.verificationConfig,
  }).returning();
  return instance;
}

export async function getWorkInstance(actor: Actor, scope: z.infer<typeof scopeSchema>, instanceId: string) {
  requireActor(actor);
  if (!scopeSchema.safeParse(scope).success || !z.string().uuid().safeParse(instanceId).success) {
    throw new RolesWorkServiceError("Invalid work instance request", "INVALID_INPUT");
  }
  await requireScopeAccess(actor, scope, employeePermissions.read);
  return getScopedWorkInstance(scope, instanceId);
}

export async function listWorkInstances(actor: Actor, scope: z.infer<typeof scopeSchema>) {
  requireActor(actor);
  if (!scopeSchema.safeParse(scope).success) throw new RolesWorkServiceError("Invalid work instance scope", "INVALID_INPUT");
  await requireScopeAccess(actor, scope, employeePermissions.read);
  return db.select().from(workInstances).where(and(
    eq(workInstances.organizationId, scope.organizationId),
    or(eq(workInstances.locationId, scope.locationId), isNull(workInstances.locationId)),
  )).orderBy(asc(workInstances.createdAt));
}

export async function transitionWorkInstance(actor: Actor, input: TransitionWorkInstanceInput) {
  requireActor(actor);
  const parsed = transitionWorkInstanceSchema.safeParse(input);
  if (!parsed.success) throw new RolesWorkServiceError("Invalid work instance transition", "INVALID_INPUT");
  await requireScopeAccess(actor, parsed.data, employeePermissions.update);
  const instance = await getScopedWorkInstance(parsed.data, parsed.data.instanceId);
  const currentState = workInstanceStateSchema.parse(instance.state);
  const allowedNext = allowedWorkInstanceTransitions[currentState];
  if (!allowedNext || parsed.data.state !== allowedNext) {
    throw new RolesWorkServiceError(
      `Invalid transition from ${currentState} to ${parsed.data.state}`,
      "INVALID_TRANSITION",
    );
  }
  if (parsed.data.state === "COMPLETED" && snapshotRequiresEvidence(instance.definitionSnapshot)) {
    const [presence] = await db.select({ id: workInstanceEvidencePresences.id }).from(workInstanceEvidencePresences).where(and(
      eq(workInstanceEvidencePresences.workInstanceId, instance.id),
      eq(workInstanceEvidencePresences.organizationId, instance.organizationId),
    ));
    if (!presence) {
      throw new RolesWorkServiceError(
        "Mandatory evidence cannot be satisfied because evidence presence is not recorded",
        "PREREQUISITE_NOT_SATISFIED",
      );
    }
  }
  if (parsed.data.state === "VERIFIED" && snapshotRequiresVerification(instance.definitionSnapshot, instance.verificationConfig)) {
    const [presence] = await db.select({ id: workInstanceVerificationPresences.id }).from(workInstanceVerificationPresences).where(and(
      eq(workInstanceVerificationPresences.workInstanceId, instance.id),
      eq(workInstanceVerificationPresences.organizationId, instance.organizationId),
    ));
    if (!presence) {
      throw new RolesWorkServiceError(
        "Required verification cannot be satisfied because verification presence is not recorded",
        "PREREQUISITE_NOT_SATISFIED",
      );
    }
  }
  const [updated] = await db.update(workInstances).set({
    state: parsed.data.state,
    updatedAt: new Date(),
  }).where(and(
    eq(workInstances.id, instance.id),
    eq(workInstances.organizationId, parsed.data.organizationId),
    eq(workInstances.state, currentState),
  )).returning();
  if (!updated) throw new RolesWorkServiceError(`Invalid transition from ${currentState} to ${parsed.data.state}`, "INVALID_TRANSITION");
  return updated;
}

async function loadWorkInstanceEvidencePresence(organizationId: string, workInstanceId: string) {
  const [presence] = await db.select().from(workInstanceEvidencePresences).where(and(
    eq(workInstanceEvidencePresences.organizationId, organizationId),
    eq(workInstanceEvidencePresences.workInstanceId, workInstanceId),
  ));
  return presence ?? null;
}

export async function createWorkInstanceEvidencePresence(actor: Actor, input: CreateWorkInstanceEvidencePresenceInput) {
  requireActor(actor);
  const parsed = workInstanceEvidencePresenceSchema.safeParse(input);
  if (!parsed.success) throw new RolesWorkServiceError("Invalid work instance evidence presence input", "INVALID_INPUT");
  await requireScopeAccess(actor, parsed.data, employeePermissions.create);
  const instance = await getScopedWorkInstance(parsed.data, parsed.data.workInstanceId);
  try {
    const [presence] = await db.insert(workInstanceEvidencePresences).values({
      organizationId: instance.organizationId,
      workInstanceId: instance.id,
    }).returning();
    return presence;
  } catch (error) {
    if (isUniqueViolation(error)) throw new RolesWorkServiceError("Evidence presence already exists for this work instance", "DUPLICATE_RECORD");
    throw error;
  }
}

export async function getWorkInstanceEvidencePresence(actor: Actor, scope: z.infer<typeof workInstanceEvidencePresenceSchema>) {
  requireActor(actor);
  const parsed = workInstanceEvidencePresenceSchema.safeParse(scope);
  if (!parsed.success) throw new RolesWorkServiceError("Invalid work instance evidence presence request", "INVALID_INPUT");
  await requireScopeAccess(actor, parsed.data, employeePermissions.read);
  await getScopedWorkInstance(parsed.data, parsed.data.workInstanceId);
  const presence = await loadWorkInstanceEvidencePresence(parsed.data.organizationId, parsed.data.workInstanceId);
  if (!presence) throw new RolesWorkServiceError("Work instance evidence presence not found", "NOT_FOUND");
  return presence;
}

async function loadWorkInstanceVerificationPresence(organizationId: string, workInstanceId: string) {
  const [presence] = await db.select().from(workInstanceVerificationPresences).where(and(
    eq(workInstanceVerificationPresences.organizationId, organizationId),
    eq(workInstanceVerificationPresences.workInstanceId, workInstanceId),
  ));
  return presence ?? null;
}

export async function createWorkInstanceVerificationPresence(actor: Actor, input: CreateWorkInstanceVerificationPresenceInput) {
  requireActor(actor);
  const parsed = workInstanceVerificationPresenceSchema.safeParse(input);
  if (!parsed.success) throw new RolesWorkServiceError("Invalid work instance verification presence input", "INVALID_INPUT");
  await requireScopeAccess(actor, parsed.data, employeePermissions.create);
  const instance = await getScopedWorkInstance(parsed.data, parsed.data.workInstanceId);
  try {
    const [presence] = await db.insert(workInstanceVerificationPresences).values({
      organizationId: instance.organizationId,
      workInstanceId: instance.id,
    }).returning();
    return presence;
  } catch (error) {
    if (isUniqueViolation(error)) throw new RolesWorkServiceError("Verification presence already exists for this work instance", "DUPLICATE_RECORD");
    throw error;
  }
}

export async function getWorkInstanceVerificationPresence(actor: Actor, scope: z.infer<typeof workInstanceVerificationPresenceSchema>) {
  requireActor(actor);
  const parsed = workInstanceVerificationPresenceSchema.safeParse(scope);
  if (!parsed.success) throw new RolesWorkServiceError("Invalid work instance verification presence request", "INVALID_INPUT");
  await requireScopeAccess(actor, parsed.data, employeePermissions.read);
  await getScopedWorkInstance(parsed.data, parsed.data.workInstanceId);
  const presence = await loadWorkInstanceVerificationPresence(parsed.data.organizationId, parsed.data.workInstanceId);
  if (!presence) throw new RolesWorkServiceError("Work instance verification presence not found", "NOT_FOUND");
  return presence;
}
