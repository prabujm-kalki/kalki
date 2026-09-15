import { db } from "@/db";
import { taskDefinitions, taskInstances, taskAuditLogs } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export type EventPayload = {
  organizationId: string;
  module: string;
  eventName: string;
  contextData: Record<string, any>;
};

export async function processEvent(payload: EventPayload) {
  // 1. Find active task definitions matching the event
  const definitions = await db.select()
    .from(taskDefinitions)
    .where(
      and(
        eq(taskDefinitions.organizationId, payload.organizationId),
        eq(taskDefinitions.module, payload.module as any),
        eq(taskDefinitions.isActive, true),
        eq(taskDefinitions.triggerType, "event")
      )
    );

  // 2. Filter definitions by matching triggerConfig (e.g. { eventName: "inventory.low_stock" })
  const matchingDefinitions = definitions.filter(def => {
    const config = def.triggerConfig as Record<string, any>;
    return config?.eventName === payload.eventName;
  });

  // 3. Create task instances
  for (const def of matchingDefinitions) {
    const [instance] = await db.insert(taskInstances).values({
      organizationId: payload.organizationId,
      definitionId: def.id,
      status: "pending",
      contextData: payload.contextData,
      assignedRoleId: def.targetRoleId,
      assignedUserId: def.targetUserId,
      dueAt: null, // optionally parse from config if due time logic is needed
    }).returning({ id: taskInstances.id });

    // 4. Log audit event
    await db.insert(taskAuditLogs).values({
      organizationId: payload.organizationId,
      taskInstanceId: instance.id,
      action: "CREATED",
      metadata: { trigger: "event", eventName: payload.eventName }
    });
  }
}
