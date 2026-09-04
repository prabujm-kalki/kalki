import { z } from "zod";
import { db } from "@/db";
import { auditEvents } from "@/db/schema";

const auditMetadataSchema = z.record(z.string(), z.unknown());

const auditEventSchema = z.object({
  organizationId: z.string().uuid(),
  locationId: z.string().uuid().nullable().optional(),
  actorUserId: z.string().trim().min(1).max(200).nullable().optional(),
  eventType: z.string().trim().min(1).max(100),
  action: z.string().trim().min(1).max(100),
  entityType: z.string().trim().min(1).max(100),
  entityId: z.string().trim().min(1).max(200),
  metadata: auditMetadataSchema.optional(),
}).strict();

const MAX_METADATA_BYTES = 16 * 1024;

export type AuditEventInput = z.infer<typeof auditEventSchema>;
export type AuditMetadata = z.infer<typeof auditMetadataSchema>;

export function validateAuditMetadata(metadata: unknown): AuditMetadata {
  const parsed = auditMetadataSchema.safeParse(metadata ?? {});
  if (!parsed.success) throw new Error("Audit metadata must be a JSON object");
  let serialized: string;
  try {
    serialized = JSON.stringify(parsed.data);
  } catch {
    throw new Error("Audit metadata must be JSON-serializable");
  }
  if (serialized.length > MAX_METADATA_BYTES) {
    throw new Error("Audit metadata exceeds the 16 KB boundary");
  }
  return parsed.data;
}

type AuditWriter = Pick<typeof db, "insert">;

export async function recordAuditEvent(input: AuditEventInput, writer: AuditWriter = db) {
  const parsed = auditEventSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid audit event input");
  const metadata = validateAuditMetadata(parsed.data.metadata);
  const [event] = await writer.insert(auditEvents).values({
    organizationId: parsed.data.organizationId,
    locationId: parsed.data.locationId ?? null,
    actorUserId: parsed.data.actorUserId ?? null,
    eventType: parsed.data.eventType,
    action: parsed.data.action,
    entityType: parsed.data.entityType,
    entityId: parsed.data.entityId,
    metadata,
  }).returning();
  return event;
}
