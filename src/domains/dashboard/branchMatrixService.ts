import { db } from "@/db";
import { locations, purchaseOrders, taskInstances, employees, attendanceSummaries } from "@/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { DashboardScopeContext, BranchComparisonItem } from "./types";

export async function getBranchComparisonMatrix(context: DashboardScopeContext): Promise<BranchComparisonItem[]> {
  const { organizationId } = context;
  if (!organizationId) return [];

  try {
    const allLocations = await db
      .select({
        id: locations.id,
        name: locations.name,
        code: locations.code,
      })
      .from(locations)
      .where(eq(locations.organizationId, organizationId));

    if (allLocations.length === 0) return [];

    const todayStr = new Date().toISOString().split("T")[0];

    const matrix: BranchComparisonItem[] = [];

    for (const loc of allLocations) {
      // 1. Pending POs
      const [poRes] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(purchaseOrders)
        .where(
          and(
            eq(purchaseOrders.organizationId, organizationId),
            eq(purchaseOrders.locationId, loc.id),
            eq(purchaseOrders.status, "PENDING")
          )
        );

      // 2. Active employees
      const [empRes] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(employees)
        .where(
          and(
            eq(employees.organizationId, organizationId),
            eq(employees.locationId, loc.id),
            eq(employees.status, "ACTIVE")
          )
        );

      const scheduled = empRes?.count || 0;

      // 3. Attendance for today (counts unique employees who have punched in or have attendance summaries)
      const attSummaries = await db
        .select({ 
          employeeId: attendanceSummaries.employeeId,
          status: attendanceSummaries.status,
          firstPunchIn: attendanceSummaries.firstPunchIn,
        })
        .from(attendanceSummaries)
        .where(
          and(
            eq(attendanceSummaries.organizationId, organizationId),
            eq(attendanceSummaries.locationId, loc.id),
            eq(attendanceSummaries.attendanceDate, todayStr)
          )
        );

      const present = attSummaries.filter((s) => {
        const st = (s.status || "").toUpperCase();
        return st === "PRESENT" || st === "HALF_DAY" || st === "PRESENT_LATE" || Boolean(s.firstPunchIn);
      }).length;
      const attRate = scheduled > 0 ? Math.round((present / scheduled) * 100) : 100;

      // 4. Tasks for this location
      const [taskRes] = await db
        .select({
          highOverdue: sql<number>`count(case when (${taskInstances.priority} = 'high' or ${taskInstances.priority} = 'urgent') and ${taskInstances.status} != 'completed' and ${taskInstances.dueAt} < now() then 1 end)::int`,
          totalTasks: sql<number>`count(*)::int`,
          doneTasks: sql<number>`count(case when ${taskInstances.status} = 'completed' then 1 end)::int`,
        })
        .from(taskInstances)
        .where(
          and(
            eq(taskInstances.organizationId, organizationId),
            sql`(${taskInstances.contextData}->>'locationId' = ${loc.id} OR ${taskInstances.contextData}->>'branchId' = ${loc.id})`
          )
        );

      const doneRate = taskRes?.totalTasks ? Math.round(((taskRes.doneTasks || 0) / taskRes.totalTasks) * 100) : 100;

      matrix.push({
        locationId: loc.id,
        locationName: loc.name,
        locationCode: loc.code,
        onDutyStaff: present,
        scheduledStaff: scheduled,
        attendancePercent: attRate,
        highPriorityOverdue: taskRes?.highOverdue || 0,
        routineDoneRate: doneRate,
        pendingPoCount: poRes?.count || 0,
      });
    }

    return matrix;
  } catch (err) {
    console.error("Error fetching getBranchComparisonMatrix:", err);
    return [];
  }
}
