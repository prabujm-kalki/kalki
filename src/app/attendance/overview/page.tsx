import { BiometricUploader } from "./BiometricUploader";
import { Users, AlertCircle, Clock, Image as ImageIcon } from "lucide-react";
import { db } from "@/db";
import { attendanceSummaries, leaveRequests, rawBiometricPunches, employees, people, shiftDefinitions } from "@/db/schema";
import { eq, and, lte, gte, desc, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/domains/session/service";

export default async function AttendanceOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ organizationId?: string; locationId?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return redirect("/login");

  const context = await getSessionContext(session.user);
  if (!context.scopes.length) return redirect("/settings");
  
  const params = await searchParams;
  let scope = context.scopes.find(s => s.organizationId === params.organizationId && s.locationId === params.locationId);
  if (!scope) {
    scope = context.scopes[0];
  }

  // Compute today's calendar date and midnight start in Asia/Kolkata (IST)
  const istDateFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" });
  const todayStr = istDateFormatter.format(new Date()); // "YYYY-MM-DD"
  
  // Start of day in IST (00:00:00 IST = previous day 18:30:00 UTC)
  const startOfDay = new Date(`${todayStr}T00:00:00+05:30`);

  // Determine user role and employee ID for RBAC
  const userEmpList = await db.select({ id: employees.id }).from(employees).where(
    and(eq(employees.userId, session.user.id), eq(employees.organizationId, scope.organizationId))
  );
  const userEmployeeId = userEmpList[0]?.id;
  const activeOrgId = params.organizationId || scope.organizationId;
  const activeLocId = params.locationId || scope.locationId;
  const isBranchScoped = Boolean(activeLocId && activeLocId !== "ALL");

  // Fetch today's punches (Live Data scoped to selected Branch/Location)
  const punchWhereConditions = [
    eq(rawBiometricPunches.organizationId, activeOrgId),
    gte(rawBiometricPunches.punchTimestamp, startOfDay)
  ];
  if (isBranchScoped) {
    punchWhereConditions.push(eq(rawBiometricPunches.locationId, activeLocId));
  }

  const todayPunches = await db.select({
    employeeId: rawBiometricPunches.employeeId,
    punchTimestamp: rawBiometricPunches.punchTimestamp,
    punchType: rawBiometricPunches.punchType
  })
  .from(rawBiometricPunches)
  .where(and(...punchWhereConditions));

  const presentEmployeeIds = new Set(todayPunches.map(p => p.employeeId));
  const presentCount = presentEmployeeIds.size;

  let lateCount = 0;
  if (presentCount > 0) {
    // 1. Fetch employee shifts
    const allEmployees = await db.select({
      id: employees.id,
      locationId: employees.locationId,
      shift: {
        startTime: shiftDefinitions.startTime,
        gracePeriodMinutes: shiftDefinitions.gracePeriodMinutes
      }
    })
    .from(employees)
    .leftJoin(shiftDefinitions, eq(employees.defaultShiftId, shiftDefinitions.id))
    .where(
      and(
        eq(employees.organizationId, activeOrgId),
        inArray(employees.id, Array.from(presentEmployeeIds).filter(Boolean) as string[])
      )
    );

    // 2. Fetch active default shifts per location for fallback if employee has no explicit defaultShiftId
    const locationShifts = await db.select({
      locationId: shiftDefinitions.locationId,
      startTime: shiftDefinitions.startTime,
      gracePeriodMinutes: shiftDefinitions.gracePeriodMinutes
    })
    .from(shiftDefinitions)
    .where(
      and(
        eq(shiftDefinitions.organizationId, activeOrgId),
        eq(shiftDefinitions.isActive, true)
      )
    );

    const locationShiftMap = new Map(locationShifts.map(s => [s.locationId, s]));
    const employeeMap = new Map(allEmployees.map(e => [e.id, e]));

    // 3. Find first punch of the day for each employee (prefer PUNCH_IN, fallback to earliest punch)
    const firstPunchMap = new Map<string, Date>();
    for (const p of todayPunches) {
      if (!p.employeeId) continue;
      const punchDate = new Date(p.punchTimestamp);
      const existing = firstPunchMap.get(p.employeeId);
      if (!existing || punchDate < existing) {
        firstPunchMap.set(p.employeeId, punchDate);
      }
    }

    // 4. Calculate late arrivals against shift start time + grace period
    for (const [empId, punchTime] of firstPunchMap.entries()) {
      const emp = employeeMap.get(empId);
      const shift = (emp?.shift && emp.shift.startTime)
        ? emp.shift
        : (emp?.locationId ? locationShiftMap.get(emp.locationId) : null);

      if (shift && shift.startTime) {
        const [sh, sm, ss] = shift.startTime.split(':');
        const hh = String(sh).padStart(2, '0');
        const mm = String(sm || '00').padStart(2, '0');
        const sec = String(ss || '00').padStart(2, '0');
        
        const expectedTime = new Date(`${todayStr}T${hh}:${mm}:${sec}+05:30`);
        const grace = Number(shift.gracePeriodMinutes) || 0;
        
        if (grace > 0) {
          expectedTime.setMinutes(expectedTime.getMinutes() + grace);
        }

        if (punchTime.getTime() > expectedTime.getTime()) {
          lateCount++;
        }
      }
    }
  }

  // Fetch absent from summaries (scoped to location)
  const absentConditions = [
    eq(attendanceSummaries.organizationId, activeOrgId),
    eq(attendanceSummaries.attendanceDate, todayStr),
    eq(attendanceSummaries.status, "ABSENT")
  ];
  if (isBranchScoped) {
    absentConditions.push(eq(attendanceSummaries.locationId, activeLocId));
  }
  const absentLogs = await db.select().from(attendanceSummaries).where(and(...absentConditions));

  // Fetch people on approved leave today (scoped to location)
  const leaveConditions = [
    eq(leaveRequests.organizationId, activeOrgId),
    eq(leaveRequests.status, "APPROVED"),
    lte(leaveRequests.startDate, todayStr),
    gte(leaveRequests.endDate, todayStr)
  ];
  if (isBranchScoped) {
    leaveConditions.push(eq(leaveRequests.locationId, activeLocId));
  }
  const leavesToday = await db.select().from(leaveRequests).where(and(...leaveConditions));

  // Fetch Recent Punches (Filtered by Location and Manager)
  const conditions = [
    eq(rawBiometricPunches.organizationId, activeOrgId),
    gte(rawBiometricPunches.punchTimestamp, startOfDay)
  ];
  if (isBranchScoped) {
    conditions.push(eq(rawBiometricPunches.locationId, activeLocId));
  }

  const isManagerOnly = !context.isOwner;
  if (isManagerOnly && userEmployeeId) {
    conditions.push(eq(employees.reportingEmployeeId, userEmployeeId));
  } else if (isManagerOnly && !userEmployeeId) {
    // If they are not owner and have no employee profile, they see nothing
    conditions.push(eq(rawBiometricPunches.organizationId, "00000000-0000-0000-0000-000000000000")); 
  }


  const recentPunches = await db.select({
    id: rawBiometricPunches.id,
    punchTimestamp: rawBiometricPunches.punchTimestamp,
    punchType: rawBiometricPunches.punchType,
    snapshotUrl: rawBiometricPunches.snapshotUrl,
    sourceType: rawBiometricPunches.sourceType,
    employeeCode: employees.employeeCode,
    displayName: people.displayName,
  })
  .from(rawBiometricPunches)
  .innerJoin(employees, eq(rawBiometricPunches.employeeId, employees.id))
  .innerJoin(people, eq(employees.personId, people.id))
  .where(and(...conditions))
  .orderBy(desc(rawBiometricPunches.punchTimestamp))
  .limit(20);

  // Present and Late are computed dynamically above
  const absentCount = absentLogs.length + leavesToday.length;

  return (
    <div className="space-y-8">
      <header className="att-header">
        <h1 className="att-title">Overview & Processing</h1>
        <p className="att-subtitle">Manage today's workforce status and ingest biometric logs.</p>
      </header>

      <div className="grid gap-6 md:grid-cols-3" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1.5rem" }}>
        <div className="att-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ margin: 0, fontSize: "1rem", color: "var(--att-text-muted)" }}>Present Today</h3>
            <Users size={20} color="var(--att-accent)" />
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 700 }}>{presentCount}</div>
          <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.875rem", color: "var(--att-text-muted)" }}>Based on biometric logs</p>
        </div>
        
        <div className="att-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ margin: 0, fontSize: "1rem", color: "var(--att-text-muted)" }}>Absent / Leave</h3>
            <AlertCircle size={20} color="#dc2626" />
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 700 }}>{absentCount}</div>
          <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.875rem", color: "var(--att-text-muted)" }}>{leavesToday.length} Approved Leaves</p>
        </div>

        <div className="att-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ margin: 0, fontSize: "1rem", color: "var(--att-text-muted)" }}>Late Ins</h3>
            <Clock size={20} color="#ca8a04" />
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 700 }}>{lateCount}</div>
          <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.875rem", color: "var(--att-text-muted)" }}>Based on biometric logs</p>
        </div>
      </div>

      <div style={{ marginTop: "2rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
        {/* Recent Punches Feed */}
        <div className="att-card" style={{ padding: "1.5rem" }}>
          <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.125rem", borderBottom: "1px solid var(--att-border)", paddingBottom: "0.5rem" }}>
            Recent Live Punches {isManagerOnly && "(Your Team)"}
          </h3>
          {recentPunches.length === 0 ? (
            <p style={{ color: "var(--att-text-muted)", fontSize: "0.875rem", textAlign: "center", padding: "2rem 0" }}>
              No punches recorded today.
            </p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "1rem" }}>
              {recentPunches.map((punch) => (
                <li key={punch.id} style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0.5rem", borderRadius: "8px", background: "var(--att-bg-subtle)" }}>
                  {punch.snapshotUrl ? (
                    <img src={punch.snapshotUrl} alt="Punch" style={{ width: "48px", height: "48px", borderRadius: "4px", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "48px", height: "48px", borderRadius: "4px", background: "var(--att-border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <ImageIcon size={20} color="var(--att-text-muted)" />
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong style={{ fontSize: "0.875rem" }}>{punch.displayName}</strong>
                      <span className={`kalki-badge ${
                        punch.punchType === "PUNCH_IN" ? "kalki-badge--success" : 
                        punch.punchType === "PUNCH_OUT" ? "kalki-badge--destructive" : 
                        "kalki-badge--warning"
                      }`}>
                        {punch.punchType.replace("_", " ")}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--att-text-muted)", marginTop: "0.25rem" }}>
                      {new Date(punch.punchTimestamp).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: '2-digit', minute: '2-digit', hour12: true })} • {punch.sourceType.replace("_", " ")}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Uploader (Hidden for managers by layout or here, but keeping it as is per instructions to not alter existing) */}
        <div>
          <BiometricUploader />
        </div>
      </div>
    </div>
  );
}
