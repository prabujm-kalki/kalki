import { db } from "@/db";
import { 
  attendanceSummaries, 
  rawBiometricPunches, 
  leaveRequests, 
  employees, 
  people, 
  leaveTypes,
  locations 
} from "@/db/schema";
import { eq, and, sql, gte, lte } from "drizzle-orm";
import { DashboardScopeContext, AttendancePulseData, LeaveRequestItem } from "./types";
import { resolveDateRange } from "./dateRangeResolver";

export async function getAttendancePulse(context: DashboardScopeContext): Promise<AttendancePulseData> {
  const { organizationId, locationId, dateRangePreset, fromDate, toDate } = context;

  const defaultResult: AttendancePulseData = {
    totalScheduled: 0,
    clockedIn: 0,
    presentRate: 100,
    lateArrivals: 0,
    absentCount: 0,
    pendingLeaves: [],
  };

  if (!organizationId) return defaultResult;

  try {
    const range = resolveDateRange(dateRangePreset, fromDate, toDate);

    const attFilters = [
      eq(attendanceSummaries.organizationId, organizationId),
      gte(attendanceSummaries.attendanceDate, range.fromDate),
      lte(attendanceSummaries.attendanceDate, range.toDate),
    ];
    if (locationId && locationId !== "ALL") {
      attFilters.push(eq(attendanceSummaries.locationId, locationId));
    }

    // 1. Query attendance summaries for the selected range
    const summaries = await db
      .select({
        status: attendanceSummaries.status,
        firstPunchIn: attendanceSummaries.firstPunchIn,
      })
      .from(attendanceSummaries)
      .where(and(...attFilters));

    let clockedIn = 0;
    let lateArrivals = 0;
    let absentCount = 0;
    let totalScheduled = summaries.length;

    for (const s of summaries) {
      const st = (s.status || "").toUpperCase();
      if (st === "PRESENT" || st === "HALF_DAY" || s.firstPunchIn) {
        clockedIn++;
      } else if (st === "ABSENT") {
        absentCount++;
      }
      if (st.includes("LATE")) {
        lateArrivals++;
      }
    }

    // Fallback: If attendance summaries haven't been compiled yet today, count punches
    if (totalScheduled === 0) {
      const punchFilters = [
        eq(rawBiometricPunches.organizationId, organizationId),
        gte(rawBiometricPunches.punchTimestamp, range.fromDateTime),
        lte(rawBiometricPunches.punchTimestamp, range.toDateTime),
      ];
      if (locationId && locationId !== "ALL") {
        punchFilters.push(eq(rawBiometricPunches.locationId, locationId));
      }

      const punches = await db
        .select({
          employeeId: rawBiometricPunches.employeeId,
        })
        .from(rawBiometricPunches)
        .where(and(...punchFilters));

      const uniquePunchedEmployees = new Set(punches.map((p) => p.employeeId).filter(Boolean));
      clockedIn = uniquePunchedEmployees.size;

      const empFilters = [
        eq(employees.organizationId, organizationId),
        eq(employees.status, "ACTIVE"),
      ];
      if (locationId && locationId !== "ALL") {
        empFilters.push(eq(employees.locationId, locationId));
      }

      const activeEmployees = await db
        .select({ id: employees.id })
        .from(employees)
        .where(and(...empFilters));

      totalScheduled = activeEmployees.length;
      absentCount = Math.max(0, totalScheduled - clockedIn);
    }

    const presentRate = totalScheduled > 0 ? Math.round((clockedIn / totalScheduled) * 100) : 100;

    // 2. Fetch pending leave requests
    const leaveFilters = [
      eq(leaveRequests.status, "PENDING"),
      eq(employees.organizationId, organizationId),
    ];
    if (locationId && locationId !== "ALL") {
      leaveFilters.push(eq(employees.locationId, locationId));
    }

    const pendingLeavesRaw = await db
      .select({
        id: leaveRequests.id,
        startDate: leaveRequests.startDate,
        endDate: leaveRequests.endDate,
        totalDays: leaveRequests.totalDays,
        reason: leaveRequests.reason,
        leaveType: leaveTypes.name,
        employeeName: people.displayName,
        employeeCode: employees.employeeCode,
        locationId: employees.locationId,
        locationName: locations.name,
      })
      .from(leaveRequests)
      .innerJoin(employees, eq(leaveRequests.employeeId, employees.id))
      .innerJoin(people, eq(employees.personId, people.id))
      .innerJoin(leaveTypes, eq(leaveRequests.leaveTypeId, leaveTypes.id))
      .leftJoin(locations, eq(employees.locationId, locations.id))
      .where(and(...leaveFilters))
      .limit(5);

    const pendingLeaves: LeaveRequestItem[] = pendingLeavesRaw.map((l) => ({
      id: l.id,
      employeeName: l.employeeName,
      employeeCode: l.employeeCode,
      leaveType: l.leaveType,
      startDate: l.startDate,
      endDate: l.endDate,
      totalDays: Number(l.totalDays) || 1,
      reason: l.reason,
      locationId: l.locationId,
      locationName: l.locationName,
    }));

    return {
      totalScheduled,
      clockedIn,
      presentRate,
      lateArrivals,
      absentCount,
      pendingLeaves,
    };
  } catch (err) {
    console.error("Error fetching getAttendancePulse:", err);
    return defaultResult;
  }
}
