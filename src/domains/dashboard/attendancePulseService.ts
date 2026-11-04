import { db } from "@/db";
import { 
  attendanceSummaries, 
  rawBiometricPunches, 
  leaveRequests, 
  employees, 
  people, 
  leaveTypes,
  locations,
  shiftDefinitions
} from "@/db/schema";
import { eq, and, sql, gte, lte, inArray } from "drizzle-orm";
import { DashboardScopeContext, AttendancePulseData, LeaveRequestItem } from "./types";
import { resolveDateRange } from "./dateRangeResolver";

function isEmployeeAttendanceExempt(emp: { employeeCode?: string | null; jobTitle?: string | null; displayName?: string | null }): boolean {
  const code = (emp.employeeCode || "").toUpperCase();
  const title = (emp.jobTitle || "").toLowerCase();
  const name = (emp.displayName || "").toLowerCase();
  if (code.includes("OWNER") || code === "KAL-EMP-0002") return true;
  if (title.includes("owner") || title.includes("director") || title.includes("executive")) return true;
  if (name.includes("owner") || name.includes("prabha")) return true;
  return false;
}

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
    const isToday = !dateRangePreset || dateRangePreset === "today";

    // 1. Fetch active employees in scope (with shift information)
    const empFilters = [
      eq(employees.organizationId, organizationId),
      eq(employees.status, "ACTIVE"),
    ];
    if (locationId && locationId !== "ALL") {
      empFilters.push(eq(employees.locationId, locationId));
    }

    const activeEmployees = await db
      .select({
        id: employees.id,
        employeeCode: employees.employeeCode,
        jobTitle: employees.jobTitle,
        displayName: people.displayName,
        locationId: employees.locationId,
        defaultShiftId: employees.defaultShiftId,
        shiftStartTime: shiftDefinitions.startTime,
        shiftGracePeriod: shiftDefinitions.gracePeriodMinutes,
      })
      .from(employees)
      .innerJoin(people, eq(employees.personId, people.id))
      .leftJoin(shiftDefinitions, eq(employees.defaultShiftId, shiftDefinitions.id))
      .where(and(...empFilters));

    // Filter out exempt owners/executives who do not punch shift attendance
    const scheduledEmployees = activeEmployees.filter((e) => !isEmployeeAttendanceExempt(e));
    const scheduledEmpIds = new Set(scheduledEmployees.map((e) => e.id));
    const totalScheduled = scheduledEmployees.length;

    // Fallback location shifts map for employees without explicit defaultShiftId
    const locationShifts = await db
      .select({
        locationId: shiftDefinitions.locationId,
        startTime: shiftDefinitions.startTime,
        gracePeriodMinutes: shiftDefinitions.gracePeriodMinutes,
      })
      .from(shiftDefinitions)
      .where(
        and(
          eq(shiftDefinitions.organizationId, organizationId),
          eq(shiftDefinitions.isActive, true)
        )
      );
    const locationShiftMap = new Map(locationShifts.map((s) => [s.locationId, s]));

    // 2. Fetch live punches for the date range
    const punchFilters = [
      eq(rawBiometricPunches.organizationId, organizationId),
      gte(rawBiometricPunches.punchTimestamp, range.fromDateTime),
      lte(rawBiometricPunches.punchTimestamp, range.toDateTime),
    ];
    if (locationId && locationId !== "ALL") {
      punchFilters.push(eq(rawBiometricPunches.locationId, locationId));
    }

    const livePunches = await db
      .select({
        employeeId: rawBiometricPunches.employeeId,
        punchTimestamp: rawBiometricPunches.punchTimestamp,
      })
      .from(rawBiometricPunches)
      .where(and(...punchFilters));

    // Map earliest punch of the day per employee
    const firstPunchMap = new Map<string, Date>();
    for (const p of livePunches) {
      if (!p.employeeId || !scheduledEmpIds.has(p.employeeId)) continue;
      const punchTime = new Date(p.punchTimestamp);
      const existing = firstPunchMap.get(p.employeeId);
      if (!existing || punchTime < existing) {
        firstPunchMap.set(p.employeeId, punchTime);
      }
    }

    // 3. Query attendance summaries as well (for historical or end-of-day compiled status)
    const attFilters = [
      eq(attendanceSummaries.organizationId, organizationId),
      gte(attendanceSummaries.attendanceDate, range.fromDate),
      lte(attendanceSummaries.attendanceDate, range.toDate),
    ];
    if (locationId && locationId !== "ALL") {
      attFilters.push(eq(attendanceSummaries.locationId, locationId));
    }

    const summaries = await db
      .select({
        employeeId: attendanceSummaries.employeeId,
        status: attendanceSummaries.status,
        firstPunchIn: attendanceSummaries.firstPunchIn,
      })
      .from(attendanceSummaries)
      .where(and(...attFilters));

    for (const s of summaries) {
      if (!s.employeeId || !scheduledEmpIds.has(s.employeeId)) continue;
      if (s.firstPunchIn) {
        const punchTime = new Date(s.firstPunchIn);
        const existing = firstPunchMap.get(s.employeeId);
        if (!existing || punchTime < existing) {
          firstPunchMap.set(s.employeeId, punchTime);
        }
      }
    }

    // Calculate Clocked In and Late Arrivals
    let clockedIn = firstPunchMap.size;
    let lateArrivals = 0;

    for (const [empId, punchTime] of firstPunchMap.entries()) {
      const emp = scheduledEmployees.find((e) => e.id === empId);
      const shiftStart = emp?.shiftStartTime || (emp?.locationId ? locationShiftMap.get(emp.locationId)?.startTime : null);
      const grace = Number(emp?.shiftGracePeriod ?? (emp?.locationId ? locationShiftMap.get(emp.locationId)?.gracePeriodMinutes : 15)) || 15;

      if (shiftStart) {
        const [sh, sm, ss] = shiftStart.split(":");
        const expected = new Date(`${range.fromDate}T${String(sh).padStart(2, "0")}:${String(sm || "00").padStart(2, "0")}:${String(ss || "00").padStart(2, "0")}+05:30`);
        if (grace > 0) {
          expected.setMinutes(expected.getMinutes() + grace);
        }
        if (punchTime.getTime() > expected.getTime()) {
          lateArrivals++;
        }
      }
    }

    // Calculate absent employees (scheduled minus clocked in)
    const absentCount = Math.max(0, totalScheduled - clockedIn);
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
