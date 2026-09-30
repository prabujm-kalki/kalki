import { db } from "@/db";
import { rawBiometricPunches, employees, shiftDefinitions } from "@/db/schema";
import { and, eq, gte, lte, asc } from "drizzle-orm";

export type AttendanceStatus = "COMPLETE" | "INCOMPLETE_MISSING_PUNCHES";

export interface ValidatedAttendanceResult {
  employeeId: string;
  attendanceStatus: AttendanceStatus;
  totalWorkingHours: number; // For HOURLY logic
  totalFullDays: number;     // For DAILY/WEEKLY/MONTHLY logic
  totalHalfDays: number;
  totalAbsentDays: number;
  dailyRecords: Array<{ date: string; hours: number }>;
}

/**
 * End-to-End calculation of raw attendance data based on pay frequency.
 */
export async function fetchValidatedAttendance(
  employeeId: string,
  frequency: "HOURLY" | "DAILY" | "WEEKLY" | "MONTHLY",
  startDate: Date | string,
  endDate: Date | string
): Promise<ValidatedAttendanceResult> {
  const startStr = typeof startDate === "string" ? startDate : startDate.toISOString().split("T")[0];
  const endStr = typeof endDate === "string" ? endDate : endDate.toISOString().split("T")[0];

  const startDt = new Date(`${startStr}T00:00:00.000Z`);
  const endDt = new Date(`${endStr}T23:59:59.999Z`);

  // 1. Fetch all raw punches
  const punches = await db
    .select()
    .from(rawBiometricPunches)
    .where(
      and(
        eq(rawBiometricPunches.employeeId, employeeId),
        gte(rawBiometricPunches.punchTimestamp, startDt),
        lte(rawBiometricPunches.punchTimestamp, endDt)
      )
    )
    .orderBy(asc(rawBiometricPunches.punchTimestamp));

  // 2. Fetch Employee's shift configuration (if needed)
  let minHoursFullDay = 8;
  let minHoursHalfDay = 4;
  
  if (frequency !== "HOURLY") {
    const empData = await db.select({ shiftId: employees.defaultShiftId }).from(employees).where(eq(employees.id, employeeId)).limit(1);
    const shiftId = empData[0]?.shiftId;
    if (shiftId) {
      const shiftData = await db.select().from(shiftDefinitions).where(eq(shiftDefinitions.id, shiftId)).limit(1);
      if (shiftData[0]) {
        minHoursFullDay = Number(shiftData[0].minHoursFullDay);
        minHoursHalfDay = Number(shiftData[0].minHoursHalfDay);
      }
    }
  }

  // 3. Group by Day
  const daysMap = new Map<string, any[]>();
  for (const p of punches) {
    const dateStr = p.punchTimestamp.toISOString().split("T")[0];
    if (!daysMap.has(dateStr)) daysMap.set(dateStr, []);
    daysMap.get(dateStr)!.push(p);
  }

  // To properly generate total days we also iterate over every date in the range
  let totalWorkingHours = 0;
  let totalFullDays = 0;
  let totalHalfDays = 0;
  let totalAbsentDays = 0;
  const dailyRecords: Array<{ date: string; hours: number }> = [];

  const currentDt = new Date(startDt);
  while (currentDt <= endDt) {
    const dateStr = currentDt.toISOString().split("T")[0];
    const dailyPunches = daysMap.get(dateStr) || [];
    currentDt.setDate(currentDt.getDate() + 1);

    if (dailyPunches.length === 0) {
      totalAbsentDays += 1;
      dailyRecords.push({ date: dateStr, hours: 0 });
      continue;
    }

    // Sort punches by time just in case
    dailyPunches.sort((a, b) => a.punchTimestamp.getTime() - b.punchTimestamp.getTime());

    const punchIn = dailyPunches.find(p => p.punchType === "PUNCH_IN");
    const breakIn = dailyPunches.find(p => p.punchType === "BREAK_IN");
    const breakOut = dailyPunches.find(p => p.punchType === "BREAK_OUT");
    const punchOut = dailyPunches.find(p => p.punchType === "PUNCH_OUT");

    // Missing Punch Validation
    if (!punchIn || !punchOut) {
      throw new Error(`Missing punching data for ${dateStr.split('-').reverse().join('-')}.`);
    }
    
    // If they have one of the break punches but not the other
    if ((breakIn && !breakOut) || (!breakIn && breakOut)) {
      throw new Error(`Missing punching data for ${dateStr.split('-').reverse().join('-')}.`);
    }

    // Calculate Hours
    const grossMs = punchOut.punchTimestamp.getTime() - punchIn.punchTimestamp.getTime();
    let breakMs = 0;
    if (breakIn && breakOut) {
      breakMs = breakOut.punchTimestamp.getTime() - breakIn.punchTimestamp.getTime();
    }
    
    // Safety check in case break out is before break in (data error)
    if (breakMs < 0) breakMs = 0;
    
    const netMs = grossMs - breakMs;
    const netHours = Math.max(0, netMs / (1000 * 60 * 60));

    dailyRecords.push({ date: dateStr, hours: netHours });

    if (frequency === "HOURLY") {
      totalWorkingHours += netHours;
    } else {
      if (netHours >= minHoursFullDay) {
        totalFullDays += 1;
      } else if (netHours >= minHoursHalfDay) {
        totalHalfDays += 1;
      } else {
        totalAbsentDays += 1; // Less than half day is absent
      }
    }
  }

  return {
    employeeId,
    attendanceStatus: "COMPLETE",
    totalWorkingHours,
    totalFullDays,
    totalHalfDays,
    totalAbsentDays,
    dailyRecords,
  };
}
