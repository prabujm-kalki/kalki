import { BiometricUploader } from "./BiometricUploader";
import { Users, AlertCircle, Clock } from "lucide-react";
import { db } from "@/db";
import { attendanceSummaries, leaveRequests } from "@/db/schema";
import { eq, and, lte, gte } from "drizzle-orm";

export default async function AttendanceOverviewPage() {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0]; // YYYY-MM-DD

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

      <div style={{ marginTop: "2rem" }}>
        <BiometricUploader />
      </div>
    </div>
  );
}
