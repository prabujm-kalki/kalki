import { db } from "@/db";
import { purchaseSchedules, taskDefinitions, taskInstances, locations, vendors, businessRoles } from "@/db/schema";
import { eq, and, gte, sql, inArray } from "drizzle-orm";
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
      priority: purchaseSchedules.priority,
      taskDefinitionId: purchaseSchedules.taskDefinitionId,
      completionTimeMins: taskDefinitions.completionTimeMins,
      vendorName: vendors.name,
      locationName: locations.name,
    })
    .from(purchaseSchedules)
    .leftJoin(vendors, eq(purchaseSchedules.vendorId, vendors.id))
    .leftJoin(locations, eq(purchaseSchedules.locationId, locations.id))
    .leftJoin(taskDefinitions, eq(purchaseSchedules.taskDefinitionId, taskDefinitions.id))
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
    let effectiveReminderTime = schedule.reminderTime;

    // 1. Check if the scheduled time has been reached or passed
    if (currentTimeStr < effectiveReminderTime) {
      continue;
    }

    // 2. Check if the frequency matches today
    let isDayMatch = false;
    const rule = schedule.frequencyRule.toUpperCase();

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

    await db.transaction(async (tx) => {
      // 3. Prevent duplicate instances from concurrent cron workers
      // Use row-level lock on the schedule instead of advisory lock for better connection pooler compatibility
      await tx.execute(sql`SELECT id FROM purchase_schedules WHERE id = ${schedule.id} FOR NO KEY UPDATE`);

      // 4. Ensure a Task Definition exists or use the selected one
      if (!schedule.taskDefinitionId) {
        console.warn(`Schedule ${schedule.id} has no task execution policy linked. Skipping execution.`);
        return;
      }
      const defId = schedule.taskDefinitionId;

      // 5. Generate the Task Instance
      const taskId = crypto.randomUUID();
      
      const [def] = await tx.select().from(taskDefinitions).where(eq(taskDefinitions.id, defId));
      if (!def) {
        console.warn(`Definition ${defId} not found.`);
        return;
      }
      
      // Calculate due date based on definition or default to 4 hours
      const completionMins = def.completionTimeMins || 240; 
      const dueAt = new Date(now.getTime() + completionMins * 60 * 1000);

      // Check if we already processed this schedule today
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tasksToday = await tx.select().from(taskInstances)
        .where(and(
          eq(taskInstances.definitionId, defId),
          gte(taskInstances.createdAt, startOfToday)
        ));
      if (tasksToday.some(t => (t.contextData as any)?.scheduleId === schedule.id)) {
        return; // Already generated or escalated today (prevents ghost tasks if time is edited)
      }

      // Check if there is an existing pending task for this definition and vendor schedule
      // Because this definition is shared, we must check contextData for scheduleId to avoid cross-blocking
      const pendingTasks = await tx.select().from(taskInstances)
        .where(and(
          eq(taskInstances.definitionId, defId),
          inArray(taskInstances.status, ["pending", "in_progress"])
        ));
        
      // Filter by scheduleId since it's stored in contextData JSON
      const matchedPending = pendingTasks.find(t => (t.contextData as any)?.scheduleId === schedule.id);

      if (matchedPending) {
        // Do not generate a new task for this cycle because the previous is still pending.
        // We let the central Task Engine (sweeper) handle all escalations based on the configured policy.
        console.warn(`Schedule ${schedule.id} cycle skipped. Task ${matchedPending.id} is still pending.`);
        return;
      }

      await tx.insert(taskInstances).values({
        id: taskId,
        organizationId: schedule.organizationId,
        definitionId: defId,
        status: "pending",
        priority: schedule.priority,
        assignedRoleId: schedule.responsibleRoleId,
        dueAt: dueAt,
        contextData: {
          scheduleId: schedule.id,
          vendorId: schedule.vendorId,
          vendorName: schedule.vendorName,
          locationId: schedule.locationId,
          locationName: schedule.locationName,
          title: `${schedule.vendorName}_${schedule.frequencyRule.charAt(0) + schedule.frequencyRule.slice(1).toLowerCase()}_${schedule.reminderTime}`,
          actionUrl: `/purchasing/stock-assessment?vendorId=${schedule.vendorId}&taskId=${taskId}`
        }
      });
      tasksCreated++;
    });
  }

  return { success: true, tasksCreated };
}
