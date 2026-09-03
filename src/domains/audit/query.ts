import { and, desc, eq, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { auditEvents } from "@/db/schema";
import { loadAuthorizationGrants } from "@/lib/authorization";

const auditQuerySchema = z.object({
  organizationId: z.string().uuid(),
  locationId: z.string().uuid(),
  entityType: z.string().trim().min(1).max(100).optional(),
  entityId: z.string().trim().min(1).max(200).optional(),
  eventType: z.string().trim().min(1).max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
}).strict();

type Actor = { id: string } | null;

export class AuditQueryError extends Error {
  constructor(message: string, public readonly code: "AUTHENTICATION_REQUIRED" | "ACCESS_DENIED" | "INVALID_INPUT") {
    super(message);
    this.name = "AuditQueryError";
  }
}

export type AuditQueryInput = z.infer<typeof auditQuerySchema>;

export async function listAuditEvents(actor: Actor, input: unknown) {
  if (!actor) throw new AuditQueryError("Authentication required", "AUTHENTICATION_REQUIRED");
  const parsed = auditQuerySchema.safeParse(input);
  if (!parsed.success) throw new AuditQueryError("Invalid audit query", "INVALID_INPUT");

  const grants = await loadAuthorizationGrants(actor.id);
  if (!grants.isOwner) throw new AuditQueryError("Audit access is restricted to the system owner", "ACCESS_DENIED");

  const filters = [
    eq(auditEvents.organizationId, parsed.data.organizationId),
    or(eq(auditEvents.locationId, parsed.data.locationId), isNull(auditEvents.locationId)),
  ];
  if (parsed.data.entityType) filters.push(eq(auditEvents.entityType, parsed.data.entityType));
  if (parsed.data.entityId) filters.push(eq(auditEvents.entityId, parsed.data.entityId));
  if (parsed.data.eventType) filters.push(eq(auditEvents.eventType, parsed.data.eventType));

  return db.select().from(auditEvents)
    .where(and(...filters))
    .orderBy(desc(auditEvents.createdAt))
    .limit(parsed.data.limit);
}
