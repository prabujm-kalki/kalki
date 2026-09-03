import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { workInstanceEvidencePresences, workInstanceVerificationPresences } from "@/db/schema";
import {
  createWorkInstanceEvidencePresence,
  createWorkInstanceVerificationPresence,
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

export async function captureEvidence(actor: Actor, input: EvidenceCaptureInput) {
  const parsed = scopeSchema.extend({ metadata: metadataSchema.optional() }).safeParse(input);
  if (!parsed.success) {
    throw new RolesWorkServiceError("Invalid evidence capture input", "INVALID_INPUT");
  }
  const metadata = validateEvidenceMetadata(parsed.data.metadata);
  const presence = await createWorkInstanceEvidencePresence(actor, {
    organizationId: parsed.data.organizationId,
    locationId: parsed.data.locationId,
    workInstanceId: parsed.data.workInstanceId,
  });
  const [updated] = await db.update(workInstanceEvidencePresences).set({
    metadata,
  }).where(and(
    eq(workInstanceEvidencePresences.id, presence.id),
    eq(workInstanceEvidencePresences.organizationId, parsed.data.organizationId),
    eq(workInstanceEvidencePresences.workInstanceId, parsed.data.workInstanceId),
  )).returning();
  return updated ?? presence;
}

export async function captureVerification(actor: Actor, input: VerificationCaptureInput) {
  const parsed = scopeSchema.extend({ metadata: metadataSchema.optional() }).safeParse(input);
  if (!parsed.success) {
    throw new RolesWorkServiceError("Invalid verification capture input", "INVALID_INPUT");
  }
  const metadata = validateEvidenceMetadata(parsed.data.metadata);
  const presence = await createWorkInstanceVerificationPresence(actor, {
    organizationId: parsed.data.organizationId,
    locationId: parsed.data.locationId,
    workInstanceId: parsed.data.workInstanceId,
  });
  const [updated] = await db.update(workInstanceVerificationPresences).set({
    metadata,
    updatedAt: new Date(),
  }).where(and(
    eq(workInstanceVerificationPresences.id, presence.id),
    eq(workInstanceVerificationPresences.organizationId, parsed.data.organizationId),
    eq(workInstanceVerificationPresences.workInstanceId, parsed.data.workInstanceId),
  )).returning();
  return updated ?? presence;
}
