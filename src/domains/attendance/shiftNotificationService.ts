import { db } from "@/db";
import { employees, shiftDefinitions, rawBiometricPunches, userDeviceTokens } from "@/db/schema";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { sendNativePushNotification } from "@/lib/pushNotificationSender";

/**
 * Attendance Shift Notification Engine
 * 
 * Runs periodically (e.g., every 5 to 15 minutes) to dispatch proactive notifications to employees:
 * 1. Pre-Shift Reminder: 15 minutes before shift starts ("Good morning! Shift starts in 15 mins.")
 * 2. Grace Period Warning: At shift start + grace period if no punch recorded ("⚠️ You haven't punched in yet! Grace period ends soon.")
 * 3. Shift End Reminder: At shift end ("Shift completed! Don't forget to punch out.")
 */
export async function runShiftNotificationScheduler(now: Date = new Date()) {
  try {
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTimeStr = `${String(currentHours).padStart(2, "0")}:${String(currentMinutes).padStart(2, "0")}:00`;

    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    // 1. Fetch active employees who have a defined default shift and a linked user account with active devices
    const eligibleEmployees = await db
      .select({
        employeeId: employees.id,
        employeeCode: employees.employeeCode,
        userId: employees.userId,
        organizationId: employees.organizationId,
        locationId: employees.locationId,
        defaultShiftId: employees.defaultShiftId,
        shiftName: shiftDefinitions.name,
        shiftStartTime: shiftDefinitions.startTime,
        shiftEndTime: shiftDefinitions.endTime,
        gracePeriodMinutes: shiftDefinitions.gracePeriodMinutes,
      })
      .from(employees)
      .innerJoin(shiftDefinitions, eq(employees.defaultShiftId, shiftDefinitions.id))
      .where(
        and(
          eq(employees.status, "ACTIVE"),
          sql`${employees.userId} IS NOT NULL`
        )
      );

    if (eligibleEmployees.length === 0) {
      return { success: true, processed: 0, sent: 0 };
    }

    let notificationsSent = 0;

    for (const emp of eligibleEmployees) {
      if (!emp.userId || !emp.shiftStartTime) continue;

      // Parse shift start time (HH:MM:SS)
      const [sH, sM] = emp.shiftStartTime.split(":").map(Number);
      const shiftStartInMinutes = sH * 60 + sM;
      const currentInMinutes = currentHours * 60 + currentMinutes;

      // Check if employee has punched in today
      const punchesToday = await db
        .select({
          id: rawBiometricPunches.id,
          punchType: rawBiometricPunches.punchType,
        })
        .from(rawBiometricPunches)
        .where(
          and(
            eq(rawBiometricPunches.employeeId, emp.employeeId),
            gte(rawBiometricPunches.punchTimestamp, startOfDay),
            lte(rawBiometricPunches.punchTimestamp, endOfDay)
          )
        );

      const hasPunchedIn = punchesToday.some(p => p.punchType === "PUNCH_IN");
      const hasPunchedOut = punchesToday.some(p => p.punchType === "PUNCH_OUT");

      // CASE 1: 15 Minutes Pre-Shift Reminder (Between 10 to 15 mins before shift)
      const minutesToShiftStart = shiftStartInMinutes - currentInMinutes;
      if (minutesToShiftStart >= 10 && minutesToShiftStart <= 15 && !hasPunchedIn) {
        await sendNativePushNotification(emp.userId, {
          title: "Upcoming Shift Reminder",
          body: `Good morning! Your ${emp.shiftName} shift starts in ${minutesToShiftStart} minutes. Remember to punch in.`,
          level: "level-2",
          data: { route: "/attendance/selfie-punch" }
        });
        notificationsSent++;
        continue;
      }

      // CASE 2: Grace Period Alert (If shift has started, within grace period or up to 5 mins after, and no punch)
      const minutesPastShiftStart = currentInMinutes - shiftStartInMinutes;
      const gracePeriod = emp.gracePeriodMinutes || 15;
      if (minutesPastShiftStart >= gracePeriod && minutesPastShiftStart <= gracePeriod + 10 && !hasPunchedIn) {
        await sendNativePushNotification(emp.userId, {
          title: "Attendance Notice: Punch Required",
          body: `⚠️ You haven't punched in yet for ${emp.shiftName}. Your ${gracePeriod}-minute grace period has passed. Tap to open selfie punch kiosk.`,
          level: "level-4",
          data: { route: "/attendance/selfie-punch" }
        });
        notificationsSent++;
        continue;
      }

      // CASE 3: Shift End Reminder (If shift end time is reached and employee hasn't punched out)
      if (emp.shiftEndTime) {
        const [eH, eM] = emp.shiftEndTime.split(":").map(Number);
        const shiftEndInMinutes = eH * 60 + eM;
        const minutesPastShiftEnd = currentInMinutes - shiftEndInMinutes;
        if (minutesPastShiftEnd >= 0 && minutesPastShiftEnd <= 15 && hasPunchedIn && !hasPunchedOut) {
          await sendNativePushNotification(emp.userId, {
            title: "Shift Completed",
            body: `Your ${emp.shiftName} shift has concluded. Don't forget to punch out before leaving!`,
            level: "level-2",
            data: { route: "/attendance/selfie-punch" }
          });
          notificationsSent++;
        }
      }
    }

    return { success: true, processed: eligibleEmployees.length, sent: notificationsSent };
  } catch (error) {
    console.error("Shift Notification Scheduler error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
