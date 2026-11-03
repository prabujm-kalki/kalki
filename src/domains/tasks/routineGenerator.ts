import { db } from "@/db";
import { taskDefinitions, taskInstances, locations, businessRoles } from "@/db/schema";
import { eq, and, gte, inArray, sql } from "drizzle-orm";
import crypto from "crypto";

export async function generateRoutineJobInstances() {
  const now = new Date();

  // Explicit Asia/Kolkata (IST) time and calendar day format
  const timeFormatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const currentTimeStr = timeFormatter.format(now); // e.g. "07:05"

  const currentDayOfWeek = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
  }).format(now); // e.g. "Tuesday"

  const currentDayOfMonth = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
  }).format(now);

  const scheduledDateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now); // "YYYY-MM-DD"

  // Fetch all active routine task definitions that have a triggerType of 'time'
  const activeDefinitions = await db
    .select()
    .from(taskDefinitions)
    .where(
      and(
        eq(taskDefinitions.isActive, true),
        eq(taskDefinitions.triggerType, "time")
      )
    );

  if (activeDefinitions.length === 0) {
    return { success: true, tasksCreated: 0 };
  }

  // Pre-fetch all locations so routine jobs dispatch across active locations for an organization
  const allLocations = await db.select().from(locations).where(eq(locations.isActive, true));

  let tasksCreated = 0;

  for (const def of activeDefinitions) {
    const config = (def.triggerConfig as any) || {};
    const triggerTime = config.triggerTime || "09:00";

    // 1. Check if current time has reached or passed configured time
    if (currentTimeStr < triggerTime) {
      continue;
    }

    // 2. Frequency check
    const frequency = (config.frequency || "daily").toLowerCase();
    let isDayMatch = false;

    if (frequency === "daily") {
      isDayMatch = true;
    } else if (frequency === "weekly" || frequency === "biweekly") {
      const selectedDays: string[] = Array.isArray(config.selectedDays)
        ? config.selectedDays.map((d: string) => d.trim().toUpperCase())
        : ["MON", "WED", "FRI"];
      const currentShort = currentDayOfWeek.slice(0, 3).toUpperCase();
      const currentFull = currentDayOfWeek.toUpperCase();
      if (selectedDays.some((d) => d === currentShort || d === currentFull)) {
        isDayMatch = true;
      }
    } else if (frequency === "monthly") {
      const targetDay = config.dayOfMonth ? String(config.dayOfMonth) : "1";
      if (targetDay === currentDayOfMonth) {
        isDayMatch = true;
      }
    }

    if (!isDayMatch) {
      continue;
    }

    // Determine target locations: either specific locations in org or all org locations
    const orgLocations = allLocations.filter((l) => l.organizationId === def.organizationId);
    const targetLocations = orgLocations.length > 0 ? orgLocations : [{ id: null, name: "All Locations", organizationId: def.organizationId }];

    // Fetch completion time / SLA
    const completionMins = def.completionTimeMins || 240; // Default 4 hours if not set
    const dueAt = new Date(now.getTime() + completionMins * 60 * 1000);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    for (const loc of targetLocations) {
      // Check if this task was already generated today for this definition and location
      const existingToday = await db
        .select({ id: taskInstances.id, contextData: taskInstances.contextData })
        .from(taskInstances)
        .where(
          and(
            eq(taskInstances.definitionId, def.id),
            gte(taskInstances.createdAt, startOfToday)
          )
        );

      const alreadyRan = existingToday.some((t) => {
        const ctx = (t.contextData as any) || {};
        return ctx.scheduledDate === scheduledDateStr && (!loc.id || ctx.locationId === loc.id);
      });

      if (alreadyRan) {
        continue;
      }

      // Check if there is an uncompleted pending/in_progress task already active for this definition & location
      const pendingTasks = await db
        .select({ id: taskInstances.id, contextData: taskInstances.contextData })
        .from(taskInstances)
        .where(
          and(
            eq(taskInstances.definitionId, def.id),
            inArray(taskInstances.status, ["pending", "in_progress"])
          )
        );

      const hasActivePending = pendingTasks.some((t) => {
        const ctx = (t.contextData as any) || {};
        return !loc.id || ctx.locationId === loc.id;
      });

      if (hasActivePending) {
        continue;
      }

      const newTaskId = crypto.randomUUID();

      await db.insert(taskInstances).values({
        id: newTaskId,
        organizationId: def.organizationId,
        definitionId: def.id,
        status: "pending",
        priority: def.priority || "medium",
        assignedRoleId: def.targetRoleId,
        assignedUserId: def.targetUserId,
        dueAt,
        contextData: {
          title: def.title,
          description: def.description,
          locationId: loc.id,
          locationName: loc.name,
          scheduledDate: scheduledDateStr,
          triggerTime,
          reminderTone: config.reminderTone || "level-1",
        },
      });

      tasksCreated++;
    }
  }

  return { success: true, tasksCreated };
}

