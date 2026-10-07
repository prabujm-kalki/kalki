import { db } from "@/db";
import { employees, rawBiometricPunches, leaveRequests } from "@/db/schema";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import { emitEvent } from "@/domains/kuab/service";

/**
 * Absenteeism Escalation Engine
 * Runs daily via Cron (e.g., at 10:00 AM) to analyze the previous day's attendance.
 * Identifies employees with missing punches or unauthorized absences,
 * and escalates them to the Kalki Universal Automation Bus (KUAB).
 */
export async function runAbsenteeismEscalation(targetDate: Date = new Date()) {
  // Target previous day by default if run in the morning
  const analysisDate = new Date(targetDate);
  analysisDate.setDate(analysisDate.getDate() - 1);
  analysisDate.setHours(0, 0, 0, 0);

  const nextDay = new Date(analysisDate);
  nextDay.setDate(nextDay.getDate() + 1);

  const dateStr = analysisDate.toISOString().split('T')[0];

  // 1. Fetch all active employees
  const activeEmployees = await db
    .select({
      id: employees.id,
      organizationId: employees.organizationId,
      departmentId: employees.departmentId,
      reportingEmployeeId: employees.reportingEmployeeId
    })
    .from(employees)
    .where(eq(employees.status, "ACTIVE"));

  let escalatedCount = 0;

  for (const emp of activeEmployees) {
    // 2. Check for approved leave
    const leaves = await db
      .select()
      .from(leaveRequests)
      .where(and(
        eq(leaveRequests.employeeId, emp.id),
        eq(leaveRequests.status, "APPROVED"),
        sql`${leaveRequests.startDate} <= ${dateStr}`,
        sql`${leaveRequests.endDate} >= ${dateStr}`
      ))
      .limit(1);

    if (leaves.length > 0) {
      // Employee is on approved leave, skip
      continue;
    }

    // 3. Check for biometric punches
    const punches = await db
      .select()
      .from(rawBiometricPunches)
      .where(and(
        eq(rawBiometricPunches.employeeId, emp.id),
        gte(rawBiometricPunches.punchTimestamp, analysisDate),
        lt(rawBiometricPunches.punchTimestamp, nextDay)
      ));

    // Analyze punches
    const punchIn = punches.find(p => p.punchType === "PUNCH_IN");
    const punchOut = punches.find(p => p.punchType === "PUNCH_OUT");

    let violationType: string | null = null;

    if (punches.length === 0) {
      violationType = "NO_SHOW"; // Completely absent without leave
    } else if (!punchIn || !punchOut) {
      violationType = "MISSING_PUNCH"; // Forgot to punch in or out
    }

    // 4. Trigger Escalation to KUAB
    if (violationType) {
      await emitEvent({
        organizationId: emp.organizationId,
        eventType: "ATTENDANCE_VIOLATION",
        sourceModule: "PAYROLL",
        payload: {
          employeeId: emp.id,
          date: dateStr,
          violationType,
          reportingManagerId: emp.reportingEmployeeId,
          departmentId: emp.departmentId
        }
      });
      escalatedCount++;
    }
  }

  return { 
    success: true, 
    dateAnalyzed: dateStr, 
    employeesAnalyzed: activeEmployees.length,
    escalationsTriggered: escalatedCount 
  };
}
