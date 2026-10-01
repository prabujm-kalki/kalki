import { db } from "@/db";
import { purchaseSchedules, taskDefinitions, taskInstances, locations, vendors } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

export async function generateRoutinePurchaseTasks() {
  const allSchedules = await db
    .select({
      id: purchaseSchedules.id,
      organizationId: purchaseSchedules.organizationId,
      locationId: purchaseSchedules.locationId,
      vendorId: purchaseSchedules.vendorId,
      responsibleRoleId: purchaseSchedules.responsibleRoleId,
      frequencyRule: purchaseSchedules.frequencyRule,
      reminderTime: purchaseSchedules.reminderTime,
      vendorName: vendors.name,
      locationName: locations.name,
    })
    .from(purchaseSchedules)
    .leftJoin(vendors, eq(purchaseSchedules.vendorId, vendors.id))
    .leftJoin(locations, eq(purchaseSchedules.locationId, locations.id))
    .where(eq(purchaseSchedules.isActive, true));

  const now = new Date();
  
  // Format current time as HH:mm
  const currentHours = now.getHours().toString().padStart(2, '0');
  const currentMinutes = now.getMinutes().toString().padStart(2, '0');
  const currentTimeStr = `${currentHours}:${currentMinutes}`;
  
  const currentDayOfWeek = now.toLocaleDateString("en-US", { weekday: "long" });
  const currentDayOfMonth = now.getDate().toString();

  let tasksCreated = 0;

  for (const schedule of allSchedules) {
    // 1. Check if the time matches
    if (schedule.reminderTime !== currentTimeStr) {
      continue;
    }

    // 2. Check if the frequency matches today
    let isDayMatch = false;
    const rule = schedule.frequencyRule;

    if (rule === "DAILY") {
      isDayMatch = true;
    } else if (rule.startsWith("WEEKLY:")) {
      const day = rule.split(":")[1];
      if (day.toLowerCase() === currentDayOfWeek.toLowerCase()) {
        isDayMatch = true;
      }
    } else if (rule.startsWith("BIWEEKLY:")) {
       // Assuming bi-weekly triggers every week on the correct day for now, 
       // a real implementation would need to track weeks since inception
       const day = rule.split(":")[1];
       if (day.toLowerCase() === currentDayOfWeek.toLowerCase()) {
         isDayMatch = true;
       }
    } else if (rule.startsWith("MONTHLY:")) {
      const day = rule.split(":")[1];
      if (day === currentDayOfMonth) {
        isDayMatch = true;
      }
    }

    if (!isDayMatch) {
      continue;
    }

    // 3. Ensure a Task Definition exists for "Routine Purchase Order" for this org
    let defs = await db.select().from(taskDefinitions)
      .where(and(
        eq(taskDefinitions.organizationId, schedule.organizationId),
        eq(taskDefinitions.module, "purchasing"),
        eq(taskDefinitions.title, "Routine Purchase Order")
      ));

    let defId: string;
    if (defs.length === 0) {
      const [def] = await db.insert(taskDefinitions).values({
        organizationId: schedule.organizationId,
        module: "purchasing",
        title: "Routine Purchase Order",
        description: "Automatically scheduled purchase order for routine vendors.",
        triggerType: "time",
        priority: "medium",
        triggerConfig: {}
      }).returning();
      defId = def.id;
    } else {
      defId = defs[0].id;
    }

    // 4. Generate the Task Instance
    const taskId = crypto.randomUUID();
    const dueAt = new Date(now.getTime() + 4 * 60 * 60 * 1000); // Due in 4 hours

    await db.insert(taskInstances).values({
      id: taskId,
      organizationId: schedule.organizationId,
      definitionId: defId,
      status: "pending",
      priority: "medium",
      assignedRoleId: schedule.responsibleRoleId,
      dueAt: dueAt,
      contextData: {
        scheduleId: schedule.id,
        vendorId: schedule.vendorId,
        vendorName: schedule.vendorName,
        locationId: schedule.locationId,
        locationName: schedule.locationName,
        title: `${schedule.vendorName}_${schedule.frequencyRule.charAt(0) + schedule.frequencyRule.slice(1).toLowerCase()}_${schedule.reminderTime}`,
        actionUrl: `/purchasing/purchase-orders/create?vendorId=${schedule.vendorId}&scheduleId=${schedule.id}`
      }
    });

    tasksCreated++;
  }

  return { success: true, tasksCreated };
}
