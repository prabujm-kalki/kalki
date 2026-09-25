const fs = require('fs');
let content = fs.readFileSync('src/app/attendance/overview/page.tsx', 'utf8');

// Fix imports
content = content.replace('import { attendanceSummaries, leaveRequests, rawBiometricPunches, employees, people } from "@/db/schema";', 'import { attendanceSummaries, leaveRequests, rawBiometricPunches, employees, people, shiftDefinitions } from "@/db/schema";');
content = content.replace('import { eq, and, lte, gte, desc } from "drizzle-orm";', 'import { eq, and, lte, gte, desc, inArray } from "drizzle-orm";');

const oldLogic =   // Fetch present today
  const presentLogs = await db.select().from(attendanceSummaries).where(
    and(
      eq(attendanceSummaries.attendanceDate, todayStr),
      eq(attendanceSummaries.status, "PRESENT")
    )
  );

  // Fetch late ins
  const lateLogs = await db.select().from(attendanceSummaries).where(
    and(
      eq(attendanceSummaries.attendanceDate, todayStr),
      eq(attendanceSummaries.status, "LATE")
    )
  );;

const newLogic =   // Fetch today's punches (Live Data)
  const todayPunches = await db.select({
    employeeId: rawBiometricPunches.employeeId,
    punchTimestamp: rawBiometricPunches.punchTimestamp,
    punchType: rawBiometricPunches.punchType
  })
  .from(rawBiometricPunches)
  .where(
    and(
      eq(rawBiometricPunches.organizationId, scope.organizationId),
      gte(rawBiometricPunches.punchTimestamp, startOfDay)
    )
  );

  const presentEmployeeIds = new Set(todayPunches.map(p => p.employeeId));
  const presentCount = presentEmployeeIds.size;

  let lateCount = 0;
  if (presentCount > 0) {
    const allEmployees = await db.select({
      id: employees.id,
      shift: {
        startTime: shiftDefinitions.startTime,
        gracePeriodMinutes: shiftDefinitions.gracePeriodMinutes
      }
    })
    .from(employees)
    .leftJoin(shiftDefinitions, eq(employees.defaultShiftId, shiftDefinitions.id))
    .where(
      and(
        eq(employees.organizationId, scope.organizationId),
        inArray(employees.id, Array.from(presentEmployeeIds))
      )
    );

    const employeeMap = new Map(allEmployees.map(e => [e.id, e]));

    // Find first punch-in for each employee today
    const firstPunchMap = new Map();
    for (const p of todayPunches) {
      if (p.punchType === "PUNCH_IN") {
        const existing = firstPunchMap.get(p.employeeId);
        if (!existing || p.punchTimestamp < existing) {
          firstPunchMap.set(p.employeeId, p.punchTimestamp);
        }
      }
    }

    // Calculate late count
    for (const [empId, punchTime] of firstPunchMap.entries()) {
      const emp = employeeMap.get(empId);
      if (emp && emp.shift && emp.shift.startTime) {
        const [sh, sm, ss] = emp.shift.startTime.split(':').map(Number);
        
        const expectedTime = new Date(startOfDay);
        expectedTime.setHours(sh, sm, ss || 0, 0);
        
        if (emp.shift.gracePeriodMinutes) {
          expectedTime.setMinutes(expectedTime.getMinutes() + emp.shift.gracePeriodMinutes);
        }

        if (punchTime > expectedTime) {
          lateCount++;
        }
      }
    }
  };

content = content.replace(oldLogic.replace(/\r/g, ''), newLogic);

const oldCounts =   const presentCount = presentLogs.length;
  const lateCount = lateLogs.length;
  const absentCount = absentLogs.length + leavesToday.length;;

const newCounts =   // Present and Late are already computed dynamically above
  const absentCount = absentLogs.length + leavesToday.length;;

content = content.replace(oldCounts.replace(/\r/g, ''), newCounts);

fs.writeFileSync('src/app/attendance/overview/page.tsx', content, 'utf8');
