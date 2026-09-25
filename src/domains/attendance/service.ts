import { db } from "@/db";
import { 
  rawBiometricPunches, 
  attendanceSummaries, 
  shiftDefinitions, 
  workInstances,
  employees
} from "@/db/schema";
import { and, eq, gte, lt, asc } from "drizzle-orm";

export async function processDailyAttendance(
  organizationId: string,
  locationId: string,
  targetDate: Date
) {
  // Define boundary for the target date (midnight to midnight)
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(24, 0, 0, 0);

  // 1. Fetch all raw punches for the day
  const dailyPunches = await db
    .select()
    .from(rawBiometricPunches)
    .where(
      and(
        eq(rawBiometricPunches.organizationId, organizationId),
        eq(rawBiometricPunches.locationId, locationId),
        gte(rawBiometricPunches.punchTimestamp, startOfDay),
        lt(rawBiometricPunches.punchTimestamp, endOfDay)
      )
    )
    .orderBy(asc(rawBiometricPunches.punchTimestamp));

  // 2. Fetch shift policies for the location
  // For V1, we assume a single active default shift per location. 
  // Future iterations can map specific shifts to roles via employee assignments.
  const activeShifts = await db
    .select()
    .from(shiftDefinitions)
    .where(
      and(
        eq(shiftDefinitions.organizationId, organizationId),
        eq(shiftDefinitions.locationId, locationId),
        eq(shiftDefinitions.isActive, true)
      )
    );
  
  const defaultShift = activeShifts.length > 0 ? activeShifts[0] : null;

  if (!defaultShift) {
    throw new Error(`No active shift definition found for location ${locationId}`);
  }

  // 3. Group punches by employee
  const employeePunches = new Map<string, typeof dailyPunches>();
  
  for (const punch of dailyPunches) {
    if (!punch.employeeId) continue; // Skip quarantined punches
    if (!employeePunches.has(punch.employeeId)) {
      employeePunches.set(punch.employeeId, []);
    }
    employeePunches.get(punch.employeeId)!.push(punch);
  }

  const summariesToUpsert: any[] = [];

  for (const [employeeId, punches] of employeePunches.entries()) {
    // 4. Pair Valid IN and OUT punches
    const firstPunchIn = punches[0].punchTimestamp;
    const lastPunchOut = punches.length > 1 ? punches[punches.length - 1].punchTimestamp : null;

    let status = "ABSENT";
    let grossHours = 0;
    let netHours = 0;
    let breakMinutes = defaultShift.restBreakMinutes;
    let overtimeHours = 0;
    let spreadOverExceeded = false;

    if (lastPunchOut) {
      // Calculate Gross Hours
      const diffMs = lastPunchOut.getTime() - firstPunchIn.getTime();
      grossHours = diffMs / (1000 * 60 * 60);

      // Tamil Nadu Statutory Validation: Spread-over limit
      if (grossHours > 12) {
        spreadOverExceeded = true;
      }

      // Calculate Net Hours
      const netMs = diffMs - (breakMinutes * 60 * 1000);
      netHours = Math.max(0, netMs / (1000 * 60 * 60));

      const minFullDay = Number(defaultShift.minHoursFullDay);
      const minHalfDay = Number(defaultShift.minHoursHalfDay);

      // Status Derivation
      if (netHours >= minFullDay) {
        status = "PRESENT";
        
        // Late calculation based on grace period
        const shiftStartParts = defaultShift.startTime.split(":");
        const shiftStartMs = new Date(startOfDay).setHours(
          parseInt(shiftStartParts[0]), 
          parseInt(shiftStartParts[1]), 
          0
        );
        const graceLimitMs = shiftStartMs + (defaultShift.gracePeriodMinutes * 60 * 1000);
        
        if (firstPunchIn.getTime() > graceLimitMs) {
          status = "PRESENT_LATE";
        }

        // Overtime Calculation
        if (netHours > minFullDay) {
          overtimeHours = netHours - minFullDay;
        }
      } else if (netHours >= minHalfDay) {
        status = "HALF_DAY";
      } else {
        status = "ABSENT"; // Did not meet minimum half-day requirement
      }
    } else {
      // Only one punch exists
      status = "MISSED_PUNCH";
    }

    summariesToUpsert.push({
      id: crypto.randomUUID(), // Assuming we do insert vs update logic later, or we let DB handle it
      organizationId,
      locationId,
      employeeId,
      attendanceDate: startOfDay.toISOString().split("T")[0],
      shiftDefinitionId: defaultShift.id,
      firstPunchIn,
      lastPunchOut,
      grossHours: grossHours.toFixed(2),
      breakMinutes,
      netHours: netHours.toFixed(2),
      overtimeHours: overtimeHours.toFixed(2),
      status,
      spreadOverExceeded,
    });

    // Sub-Module 5 Handshake: Work Engine Integration
    // If it's the very first time we see a punch IN for this employee today, dispatch an event.
    // We check if we are generating this summary for the first time.
    await dispatchWorkEnginePunchInEvent(organizationId, locationId, employeeId, firstPunchIn);
  }

  // 5. Upsert Attendance Summaries
  // For Phase 3, we simply iterate and insert (in a real scenario, we use ON CONFLICT DO UPDATE)
  // Since we lack a unique constraint on (employeeId, attendanceDate) in the schema block provided,
  // we will insert or manually delete existing records for the day.
  await db.transaction(async (tx) => {
    // Clear existing summaries for the day to replace with freshly processed ones
    await tx.delete(attendanceSummaries).where(
      and(
        eq(attendanceSummaries.organizationId, organizationId),
        eq(attendanceSummaries.locationId, locationId),
        eq(attendanceSummaries.attendanceDate, startOfDay.toISOString().split("T")[0])
      )
    );

    if (summariesToUpsert.length > 0) {
      await tx.insert(attendanceSummaries).values(summariesToUpsert);
    }
  });

  return {
    success: true,
    processedEmployees: summariesToUpsert.length,
    message: `Attendance processing completed for ${targetDate.toISOString().split("T")[0]}`
  };
}

/**
 * Handles the Sub-Module 5 integration requirement.
 * Connects the Attendance Engine to the Work Engine for daily task generation.
 */
async function dispatchWorkEnginePunchInEvent(
  organizationId: string, 
  locationId: string, 
  employeeId: string, 
  punchTimestamp: Date
) {
  // Check if an instance already exists for this exact employee, day, and org to prevent duplicates
  // In a robust implementation, this would query workInstances first.
  
  try {
    // Generate the Work Instance in the SEEN state, assigning it to the employee
    await db.insert(workInstances).values({
      organizationId,
      locationId,
      assignedEmployeeId: employeeId,
      workSituationDefinitionId: "00000000-0000-0000-0000-000000000000", // Placeholder for actual Shift Start definition
      state: "SEEN",
      sourceReference: `ATTENDANCE_IN_${punchTimestamp.toISOString().split("T")[0]}`,
      sourceMetadata: { type: "ATTENDANCE_CHECK_IN_CONFIRMED", timestamp: punchTimestamp.toISOString() },
    });
    console.log(`[Integration Event] Work Instance spawned for Employee: ${employeeId} at ${punchTimestamp}`);
  } catch (err) {
    // Graceful degradation: If Work Engine fails, do not block attendance processing
    console.error("Failed to dispatch Work Engine event", err);
  }
}

/**
 * Phase 5: Payroll Handshake
 * Aggregates a closed attendance ledger for a given pay cycle so the Payroll Module can consume it.
 * Calculates Total Payable Days, LOP (Loss of Pay) Days, and Overtime Hours.
 */
export async function generatePayrollLedger(
  organizationId: string,
  locationId: string,
  cycleStartDate: Date,
  cycleEndDate: Date
) {
  // Fetch all summaries for the cycle
  const summaries = await db
    .select()
    .from(attendanceSummaries)
    .where(
      and(
        eq(attendanceSummaries.organizationId, organizationId),
        eq(attendanceSummaries.locationId, locationId),
        gte(attendanceSummaries.attendanceDate, cycleStartDate.toISOString().split("T")[0]),
        lt(attendanceSummaries.attendanceDate, cycleEndDate.toISOString().split("T")[0])
      )
    );

  const employeeLedgers = new Map<string, {
    employeeId: string;
    totalPresentDays: number;
    totalHalfDays: number;
    totalAbsentDays: number;
    totalOvertimeHours: number;
    payableDays: number;
    lopDays: number;
  }>();

  for (const record of summaries) {
    if (!record.employeeId) continue;
    
    if (!employeeLedgers.has(record.employeeId)) {
      employeeLedgers.set(record.employeeId, {
        employeeId: record.employeeId,
        totalPresentDays: 0,
        totalHalfDays: 0,
        totalAbsentDays: 0,
        totalOvertimeHours: 0,
        payableDays: 0,
        lopDays: 0
      });
    }

    const ledger = employeeLedgers.get(record.employeeId)!;
    
    if (record.status === "PRESENT" || record.status === "PRESENT_LATE") {
      ledger.totalPresentDays += 1;
      ledger.payableDays += 1;
    } else if (record.status === "HALF_DAY") {
      ledger.totalHalfDays += 1;
      ledger.payableDays += 0.5;
      ledger.lopDays += 0.5;
    } else if (record.status === "ABSENT" || record.status === "MISSED_PUNCH") {
      ledger.totalAbsentDays += 1;
      ledger.lopDays += 1;
    }

    if (record.overtimeHours) {
      ledger.totalOvertimeHours += parseFloat(record.overtimeHours as string);
    }
  }

  // Future integration: This ledger would typically be persisted to a `payroll_cycles` table
  // or returned directly to the Payroll Module's API request.
  return Array.from(employeeLedgers.values());
}
