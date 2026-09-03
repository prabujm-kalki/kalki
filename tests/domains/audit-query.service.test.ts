import "dotenv/config";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { auditEvents, authUsers, locations, organizations, systemAuthorities } from "@/db/schema";
import { AuditQueryError, listAuditEvents } from "@/domains/audit/query";

const organizationId = randomUUID();
const otherOrganizationId = randomUUID();
const locationId = randomUUID();
const otherLocationId = randomUUID();
const ownerUserId = `audit-owner-${randomUUID()}`;
const deniedUserId = `audit-denied-${randomUUID()}`;

const scope = { organizationId, locationId };

beforeAll(async () => {
  await db.insert(organizations).values([
    { id: organizationId, name: "Audit query organization", code: `AQ-${organizationId.slice(0, 8)}` },
    { id: otherOrganizationId, name: "Other audit organization", code: `AQ-${otherOrganizationId.slice(0, 8)}` },
  ]);
  await db.insert(locations).values([
    { id: locationId, organizationId, name: "Audit query location", code: "AQ-LOC" },
    { id: otherLocationId, organizationId: otherOrganizationId, name: "Other audit location", code: "AQ-OTHER" },
  ]);
  await db.insert(authUsers).values([
    { id: ownerUserId, name: "Audit Owner", email: `${ownerUserId}@example.invalid`, emailVerified: true, createdAt: new Date(), updatedAt: new Date() },
    { id: deniedUserId, name: "Audit Denied", email: `${deniedUserId}@example.invalid`, emailVerified: true, createdAt: new Date(), updatedAt: new Date() },
  ]);
  await db.insert(systemAuthorities).values({ userId: ownerUserId, authority: "OWNER" });
  await db.insert(auditEvents).values([
    {
      organizationId,
      locationId,
      actorUserId: ownerUserId,
      eventType: "work",
      action: "created",
      entityType: "work_instance",
      entityId: "work-001",
      metadata: { source: "test" },
    },
    {
      organizationId,
      locationId: null,
      actorUserId: ownerUserId,
      eventType: "configuration",
      action: "updated",
      entityType: "work_definition",
      entityId: "definition-001",
      metadata: { source: "test" },
    },
    {
      organizationId,
      locationId: locationId,
      actorUserId: ownerUserId,
      eventType: "work",
      action: "completed",
      entityType: "work_instance",
      entityId: "work-002",
      metadata: { source: "test" },
    },
    {
      organizationId: otherOrganizationId,
      locationId: otherLocationId,
      actorUserId: ownerUserId,
      eventType: "work",
      action: "created",
      entityType: "work_instance",
      entityId: "other-work",
      metadata: { source: "test" },
    },
  ]);
});

afterAll(async () => {
  await db.delete(auditEvents).where(eq(auditEvents.organizationId, organizationId));
  await db.delete(auditEvents).where(eq(auditEvents.organizationId, otherOrganizationId));
  await db.delete(systemAuthorities).where(eq(systemAuthorities.userId, ownerUserId));
  await db.delete(authUsers).where(and(eq(authUsers.id, ownerUserId)));
  await db.delete(authUsers).where(and(eq(authUsers.id, deniedUserId)));
  await db.delete(locations).where(eq(locations.id, locationId));
  await db.delete(locations).where(eq(locations.id, otherLocationId));
  await db.delete(organizations).where(eq(organizations.id, organizationId));
  await db.delete(organizations).where(eq(organizations.id, otherOrganizationId));
});

describe("audit query boundary", () => {
  it("requires an authenticated actor", async () => {
    await expect(listAuditEvents(null, scope)).rejects.toMatchObject({ code: "AUTHENTICATION_REQUIRED" });
  });

  it("restricts audit reads to the system owner", async () => {
    await expect(listAuditEvents({ id: deniedUserId }, scope)).rejects.toMatchObject({ code: "ACCESS_DENIED" });
  });

  it("returns only the requested organization and visible location or organization-level events", async () => {
    const events = await listAuditEvents({ id: ownerUserId }, scope);
    expect(events).toHaveLength(3);
    expect(events.every((event) => event.organizationId === organizationId)).toBe(true);
    expect(events.map((event) => event.entityId)).toEqual(expect.arrayContaining(["work-001", "definition-001", "work-002"]));
  });

  it("supports entity and event filters and a bounded limit", async () => {
    const workEvents = await listAuditEvents({ id: ownerUserId }, {
      ...scope,
      entityType: "work_instance",
      eventType: "work",
      limit: 1,
    });
    expect(workEvents).toHaveLength(1);
    expect(workEvents[0]?.entityType).toBe("work_instance");
    expect(workEvents[0]?.eventType).toBe("work");
  });

  it("rejects malformed query input", async () => {
    await expect(listAuditEvents({ id: ownerUserId }, { ...scope, limit: 101 })).rejects.toMatchObject({ code: "INVALID_INPUT" });
    await expect(listAuditEvents({ id: ownerUserId }, { organizationId: "not-a-uuid", locationId })).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });

  it("uses the domain error contract for direct callers", async () => {
    try {
      await listAuditEvents({ id: deniedUserId }, scope);
      throw new Error("expected access denial");
    } catch (error) {
      expect(error).toBeInstanceOf(AuditQueryError);
    }
  });
});
