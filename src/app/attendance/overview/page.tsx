import { BiometricUploader } from "./BiometricUploader";
import { Users, AlertCircle, Clock, Image as ImageIcon } from "lucide-react";
import { db } from "@/db";
import { attendanceSummaries, leaveRequests, rawBiometricPunches, employees, people } from "@/db/schema";
import { eq, and, lte, gte, desc } from "drizzle-orm";
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

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0]; // YYYY-MM-DD
  
  // Start of day for punch filtering
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);

  // Determine user role and employee ID for RBAC
  const userEmpList = await db.select({ id: employees.id }).from(employees).where(
    and(eq(employees.userId, session.user.id), eq(employees.organizationId, scope.organizationId))
  );
  const userEmployeeId = userEmpList[0]?.id;
  const isManagerOnly = !context.isOwner; // If not owner, restrict to their direct reports

  // Fetch present today
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
  );

  // Fetch absent from summaries
  const absentLogs = await db.select().from(attendanceSummaries).where(
    and(
      eq(attendanceSummaries.attendanceDate, todayStr),
      eq(attendanceSummaries.status, "ABSENT")
    )
  );

  // Fetch people on approved leave today
  const leavesToday = await db.select().from(leaveRequests).where(
    and(
      eq(leaveRequests.status, "APPROVED"),
      lte(leaveRequests.startDate, todayStr),
      gte(leaveRequests.endDate, todayStr)
    )
  );

  // Fetch Recent Punches (Filtered by Manager)
  const conditions = [
    eq(rawBiometricPunches.organizationId, scope.organizationId),
    gte(rawBiometricPunches.punchTimestamp, startOfDay)
  ];
  if (isManagerOnly && userEmployeeId) {
    console.log("Filtering by reportingEmployeeId =", userEmployeeId);
    conditions.push(eq(employees.reportingEmployeeId, userEmployeeId));
  } else if (isManagerOnly && !userEmployeeId) {
    console.log("Manager but no userEmployeeId. Blanking out query.");
    // If they are not owner and have no employee profile, they see nothing
    conditions.push(eq(rawBiometricPunches.organizationId, "00000000-0000-0000-0000-000000000000")); 
  } else {
    console.log("Owner mode. Fetching all for org =", scope.organizationId);
  }

  console.log("startOfDay =", startOfDay);


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

  const presentCount = presentLogs.length;
  const lateCount = lateLogs.length;
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
                      {new Date(punch.punchTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {punch.sourceType.replace("_", " ")}
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
