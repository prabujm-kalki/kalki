import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  workInstanceEvidencePresences,
  workInstanceVerificationPresences,
  workInstances,
} from "@/db/schema";
import { authorizeEmployeeOperation } from "@/lib/authorization";
import { employeePermissions } from "@/lib/authorization-policy";
import {
  type CreateWorkInstanceEvidencePresenceInput,
  type CreateWorkInstanceVerificationPresenceInput,
  RolesWorkServiceError,
} from "@/domains/roles-work/service";

type Actor = { id: string } | null;

const scopeSchema = z.object({
  organizationId: z.string().uuid(),
  locationId: z.string().uuid(),
  workInstanceId: z.string().uuid(),
}).strict();

const metadataSchema = z.record(z.string(), z.unknown());

export type EvidenceMetadata = z.infer<typeof metadataSchema>;
export type EvidenceCaptureInput = CreateWorkInstanceEvidencePresenceInput & { metadata?: EvidenceMetadata };
export type VerificationCaptureInput = CreateWorkInstanceVerificationPresenceInput & { metadata?: EvidenceMetadata };

const MAX_METADATA_BYTES = 16 * 1024;

export function validateEvidenceMetadata(metadata: unknown): EvidenceMetadata {
  const parsed = metadataSchema.safeParse(metadata ?? {});
  if (!parsed.success) {
    throw new RolesWorkServiceError("Evidence metadata must be a JSON object", "INVALID_INPUT");
  }
  let serialized: string;
  try {
    serialized = JSON.stringify(parsed.data);
  } catch {
    throw new RolesWorkServiceError("Evidence metadata must be JSON-serializable", "INVALID_INPUT");
  }
  if (serialized.length > MAX_METADATA_BYTES) {
    throw new RolesWorkServiceError("Evidence metadata exceeds the 16 KB boundary", "INVALID_INPUT");
  }
  return parsed.data;
}

function requireActor(actor: Actor): asserts actor is { id: string } {
  if (!actor) throw new RolesWorkServiceError("Authentication required", "AUTHENTICATION_REQUIRED");
}

async function requireEvidenceScopeAccess(actor: { id: string }, scope: z.infer<typeof scopeSchema>) {
  const allowed = await authorizeEmployeeOperation({
    userId: actor.id,
    organizationId: scope.organizationId,
    locationId: scope.locationId,
    permission: employeePermissions.create,
  });
  if (!allowed) throw new RolesWorkServiceError("Access denied", "ACCESS_DENIED");
}

async function requireVisibleWorkInstance(scope: z.infer<typeof scopeSchema>) {
  const [instance] = await db.select({
    id: workInstances.id,
    organizationId: workInstances.organizationId,
    locationId: workInstances.locationId,
  }).from(workInstances).where(and(
    eq(workInstances.id, scope.workInstanceId),
    eq(workInstances.organizationId, scope.organizationId),
  ));
  if (!instance || (instance.locationId !== null && instance.locationId !== scope.locationId)) {
    throw new RolesWorkServiceError("Work instance not found", "NOT_FOUND");
  }
  return instance;
}

export async function captureEvidence(actor: Actor, input: EvidenceCaptureInput) {
  requireActor(actor);
  const parsed = scopeSchema.extend({ metadata: metadataSchema.optional() }).safeParse(input);
  if (!parsed.success) {
    throw new RolesWorkServiceError("Invalid evidence capture input", "INVALID_INPUT");
  }
  const metadata = validateEvidenceMetadata(parsed.data.metadata);
  await requireEvidenceScopeAccess(actor, parsed.data);
  const instance = await requireVisibleWorkInstance(parsed.data);
  const [presence] = await db.insert(workInstanceEvidencePresences).values({
    organizationId: instance.organizationId,
    workInstanceId: instance.id,
    metadata,
  }).onConflictDoUpdate({
    target: workInstanceEvidencePresences.workInstanceId,
    set: {
      metadata,
      updatedAt: new Date(),
    },
  }).returning();
  if (!presence) throw new RolesWorkServiceError("Evidence could not be recorded", "PREREQUISITE_NOT_SATISFIED");
  return presence;
}

export async function captureVerification(actor: Actor, input: VerificationCaptureInput) {
  requireActor(actor);
  const parsed = scopeSchema.extend({ metadata: metadataSchema.optional() }).safeParse(input);
  if (!parsed.success) {
    throw new RolesWorkServiceError("Invalid verification capture input", "INVALID_INPUT");
  }
  const metadata = validateEvidenceMetadata(parsed.data.metadata);
  await requireEvidenceScopeAccess(actor, parsed.data);
  const instance = await requireVisibleWorkInstance(parsed.data);
  const [presence] = await db.insert(workInstanceVerificationPresences).values({
    organizationId: instance.organizationId,
    workInstanceId: instance.id,
    metadata,
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: workInstanceVerificationPresences.workInstanceId,
    set: {
      metadata,
      updatedAt: new Date(),
    },
  }).returning();
  if (!presence) throw new RolesWorkServiceError("Verification could not be recorded", "PREREQUISITE_NOT_SATISFIED");
  return presence;
}
