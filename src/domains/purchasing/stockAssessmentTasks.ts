import { db } from "@/db";
import { taskDefinitions, taskInstances, locations } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

export async function generateDailyStockTasks() {
  const allLocations = await db.select().from(locations);
  const now = new Date();
  
  let tasksCreated = 0;
  const currentHour = now.getHours();

  for (const loc of allLocations) {
    // Find all time-based inventory tasks for this organization
    let defs = await db.select().from(taskDefinitions)
      .where(and(
        eq(taskDefinitions.organizationId, loc.organizationId),
        eq(taskDefinitions.module, "inventory"),
        eq(taskDefinitions.triggerType, "time")
      ));

    // If none exist, simply skip. The user has either deleted the blueprint or hasn't created one.
    if (defs.length === 0) {
      continue;
    }

    for (const def of defs) {
      const config = def.triggerConfig as { timeOfDay?: string, deadlineHours?: number } | null;
    const timeOfDayStr = config?.timeOfDay || "08:00";
    const configuredHour = parseInt(timeOfDayStr.split(":")[0], 10);
    
    // Only generate the task if the current hour matches the configured hour
    if (currentHour !== configuredHour) {
      continue;
    }

    const deadlineHours = config?.deadlineHours || 4;
    const dueAt = new Date(now.getTime() + deadlineHours * 60 * 60 * 1000);

    // Check if there is an existing pending task for this definition and location
    const existingTasks = await db.select().from(taskInstances)
      .where(and(
        eq(taskInstances.definitionId, def.id),
        eq(taskInstances.status, "pending")
      ));

    if (existingTasks.length > 0) {
      // Do not generate a new task if the previous one is still pending.
      // We rely entirely on the Unified Escalation Sweeper (sweeper.ts) and the Blueprint's matrix
      // to handle the overdue state of the existing task.
      console.warn(`Stock Assessment cycle skipped for location ${loc.name}. A previous task is still pending.`);
      continue;
    }

    // Insert task instance
    const taskId = crypto.randomUUID();
    await db.insert(taskInstances).values({
      id: taskId,
      organizationId: loc.organizationId,
      definitionId: def.id,
      status: "pending",
      priority: "high",
      dueAt: dueAt,
      contextData: { 
        locationId: loc.id,
        locationName: loc.name,
        actionUrl: `/purchasing/stock-assessment?taskId=${taskId}`
      }
    });
    tasksCreated++;
    } // close defs loop
  } // close locs loop

  return { success: true, tasksCreated };
}
