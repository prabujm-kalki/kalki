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

    // If none exist, we will create the default one
    if (defs.length === 0) {
      const [def] = await db.insert(taskDefinitions).values({
        organizationId: loc.organizationId,
        module: "inventory",
        title: "Perform Daily Stock Assessment",
        description: "Manually verify and enter the current physical stock for all items.",
        triggerType: "time",
        priority: "high",
        triggerConfig: { timeOfDay: "08:00", deadlineHours: 4 }
      }).returning();
      defs = [def];
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
