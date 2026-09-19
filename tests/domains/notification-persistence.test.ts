import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "../../src/db";
import {
  organizations,
  workSituationDefinitions,
  workInstances,
  workEscalationHistory,
  notificationEvents,
  notificationDeliveries,
  schedulerRuns,
  notificationProviderEvents,
  notificationPreferences,
  authUsers,
} from "../../src/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
const uuidv4 = () => crypto.randomUUID();

// We will use actual postgres constraint errors to verify persistence invariants.

describe("Notification Persistence Foundation", () => {
  let orgId: string;
  let defId: string;
  let userId: string;

  beforeEach(async () => {
    orgId = uuidv4();
    defId = uuidv4();
    userId = `testuser_${uuidv4()}`;

    // Setup base data
    await db.insert(organizations).values({ id: orgId, name: "Test Org", code: `TST_${orgId.substring(0, 5)}` });
    await db.insert(workSituationDefinitions).values({
      id: defId,
      organizationId: orgId,
      triggerCategory: "routine",
      title: "Test Def",
      description: "Test Description",
      sourceReference: "ref_1",
      timingConfig: {},
      evidenceConfig: {},
    });
    // Note: We'd need an authUser for foreign keys if we strictly enforce it. 
    // In many tests authUsers might be mocked or inserted if it's a real PG test DB.
    try {
        await db.insert(authUsers).values({ id: userId, email: `${userId}@test.com`, name: "Test", emailVerified: true, createdAt: new Date(), updatedAt: new Date() });
    } catch(e) {
        // user might already exist or the table structure might vary slightly, but assuming this works for now.
    }
  });

  afterEach(async () => {
    // Cleanup cascade should handle most of it if we just delete the org
    try {
       await db.delete(workSituationDefinitions).where(eq(workSituationDefinitions.id, defId));
    } catch(e) {}
    try {
       await db.delete(organizations).where(eq(organizations.id, orgId));
    } catch(e) {}
    try {
       await db.delete(authUsers).where(eq(authUsers.id, userId));
    } catch(e) {}
  });

  it("should persist due_at on workInstances", async () => {
    const instanceId = uuidv4();
    const dueAt = new Date("2030-01-01T10:00:00Z");

    await db.insert(workInstances).values({
      id: instanceId,
      organizationId: orgId,
      workSituationDefinitionId: defId,
      sourceReference: "inst_1",
      dueAt,
    });

    const result = await db.select().from(workInstances).where(eq(workInstances.id, instanceId));
    expect(result[0].dueAt).toEqual(dueAt);
  });

  it("should enforce escalation idempotency (occurrence unique constraint)", async () => {
    const instanceId = uuidv4();
    await db.insert(workInstances).values({
      id: instanceId,
      organizationId: orgId,
      workSituationDefinitionId: defId,
      sourceReference: "inst_2",
    });

    // First insert should succeed
    await db.insert(workEscalationHistory).values({
      organizationId: orgId,
      workInstanceId: instanceId,
      stagePosition: 1,
      occurrenceIndex: 0,
      triggerCondition: "overdue_15m",
    });

    // Second insert with same instance, stage, and occurrence should fail
    await expect(
      db.insert(workEscalationHistory).values({
        organizationId: orgId,
        workInstanceId: instanceId,
        stagePosition: 1,
        occurrenceIndex: 0, // Duplicate
        triggerCondition: "overdue_15m",
      })
    ).rejects.toThrow();
  });

  it("should enforce notification event uniqueness (idempotency key)", async () => {
    const idempotencyKey = uuidv4();

    await db.insert(notificationEvents).values({
      organizationId: orgId,
      sourceEvent: "escalation_1",
      notificationType: "PUSH",
      recipientUserId: userId,
      idempotencyKey,
    });

    await expect(
      db.insert(notificationEvents).values({
        organizationId: orgId,
        sourceEvent: "escalation_1",
        notificationType: "PUSH",
        recipientUserId: userId,
        idempotencyKey, // Duplicate
      })
    ).rejects.toThrow();
  });

  it("should fail to insert notification event for non-existent org", async () => {
    await expect(
      db.insert(notificationEvents).values({
        organizationId: uuidv4(), // Invalid org
        sourceEvent: "test",
        notificationType: "PUSH",
        recipientUserId: userId,
      })
    ).rejects.toThrow();
  });

  it("should track scheduler runs", async () => {
    const runId = uuidv4();
    await db.insert(schedulerRuns).values({
      id: runId,
      workerIdentity: "worker-1",
      status: "RUNNING",
    });

    const result = await db.select().from(schedulerRuns).where(eq(schedulerRuns.id, runId));
    expect(result[0].workerIdentity).toBe("worker-1");
    expect(result[0].status).toBe("RUNNING");
  });
});
