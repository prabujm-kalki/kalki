import { db } from "@/db";
import { leaveRequests, employees, leaveTypes, people, leaveEncashmentRequests } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getSessionContext } from "@/domains/session/service";
import ApprovalList from "@/components/attendance/ApprovalList";
import EncashmentApprovalList from "@/components/attendance/EncashmentApprovalList";
import { redirect } from "next/navigation";

export default async function ApprovalsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/sign-in");
  }

  const grants = await getSessionContext(session.user);
  const canManage = grants.isOwner || grants.scopes.some(s => s.permissions.includes("attendance.approvals:manage"));

  // Fetch the employee ID for the current user
  const empRecords = await db.select({ id: employees.id }).from(employees).where(eq(employees.userId, session.user.id)).limit(1);
  const currentEmpId = empRecords.length > 0 ? empRecords[0].id : null;

  // If they are not an approver and have no manage permissions, they shouldn't see anything.
  if (!currentEmpId && !canManage) {
    return (
      <div>
        <header className="att-header">
          <h1 className="att-title">Approvals & Exceptions</h1>
        </header>
        <div className="att-card">
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--att-text-muted)" }}>
            You do not have permission to view approvals.
          </div>
        </div>
      </div>
    );
  }

  let conditions = eq(leaveRequests.status, "PENDING");
  
  if (!canManage) {
    // Regular manager can only see requests assigned to them
    conditions = and(conditions, eq(leaveRequests.approverId, currentEmpId!)) as any;
  }

  const rawRequests = await db.select({
    id: leaveRequests.id,
    startDate: leaveRequests.startDate,
    endDate: leaveRequests.endDate,
    totalDays: leaveRequests.totalDays,
    reason: leaveRequests.reason,
    leaveType: leaveTypes.name,
    employeeName: people.displayName,
    employeeCode: employees.employeeCode,
    evidenceUrl: leaveRequests.evidenceUrl,
  })
  .from(leaveRequests)
  .innerJoin(employees, eq(leaveRequests.employeeId, employees.id))
  .innerJoin(people, eq(employees.personId, people.id))
  .innerJoin(leaveTypes, eq(leaveRequests.leaveTypeId, leaveTypes.id))
  .where(conditions);

  // Fetch Encashment Requests
  let encashmentConditions = eq(leaveEncashmentRequests.status, "PENDING");
  if (!canManage) {
    encashmentConditions = and(encashmentConditions, eq(leaveEncashmentRequests.approverId, currentEmpId!)) as any;
  }
  
  const rawEncashmentRequests = await db.select({
    id: leaveEncashmentRequests.id,
    leaveType: leaveTypes.name,
    encashmentDays: leaveEncashmentRequests.encashmentDays,
    reason: leaveEncashmentRequests.reason,
    employeeName: people.displayName,
    employeeCode: employees.employeeCode,
  })
  .from(leaveEncashmentRequests)
  .innerJoin(employees, eq(leaveEncashmentRequests.employeeId, employees.id))
  .innerJoin(people, eq(employees.personId, people.id))
  .innerJoin(leaveTypes, eq(leaveEncashmentRequests.leaveTypeId, leaveTypes.id))
  .where(encashmentConditions);

  // Fetch all employees for the forward dropdown
  const allActiveEmployees = await db.select({
    id: employees.id,
    name: people.displayName,
  })
  .from(employees)
  .innerJoin(people, eq(employees.personId, people.id))
  .where(eq(employees.isActive, true));

  // Fetch Actioned History
  let historyConditions = and(
    // Fetch non-pending requests
    or(eq(leaveRequests.status, "APPROVED"), eq(leaveRequests.status, "REJECTED")),
    // Only if actioned by current user
    eq(leaveRequests.actionedBy, session.user.id)
  );

  const historyRequests = await db.select({
    id: leaveRequests.id,
    startDate: leaveRequests.startDate,
    endDate: leaveRequests.endDate,
    totalDays: leaveRequests.totalDays,
    status: leaveRequests.status,
    leaveType: leaveTypes.name,
    employeeName: people.displayName,
    actionedAt: leaveRequests.actionedAt,
    evidenceUrl: leaveRequests.evidenceUrl,
  })
  .from(leaveRequests)
  .innerJoin(employees, eq(leaveRequests.employeeId, employees.id))
  .innerJoin(people, eq(employees.personId, people.id))
  .innerJoin(leaveTypes, eq(leaveRequests.leaveTypeId, leaveTypes.id))
  .where(historyConditions as any)
  .orderBy(leaveRequests.actionedAt);

  return (
    <div>
      <header className="att-header">
        <h1 className="att-title">Approvals & Exceptions</h1>
        <p className="att-subtitle">Review leave requests and attendance regularizations.</p>
      </header>

      <div className="att-card" style={{ marginBottom: "2rem" }}>
        <ApprovalList requests={rawRequests} />
      </div>

      <div className="att-card" style={{ marginBottom: "2rem" }}>
        <h3 style={{ margin: "0 0 1.5rem 0", fontSize: "1.25rem", color: "var(--att-primary)" }}>
          Leave Encashment Requests
        </h3>
        <EncashmentApprovalList requests={rawEncashmentRequests} allEmployees={allActiveEmployees} />
      </div>

      <div className="att-card">
        <h3 style={{ margin: "0 0 1.5rem 0", fontSize: "1.25rem", color: "var(--att-primary)" }}>
          Actioned Requests History
        </h3>
        
        {historyRequests.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--att-text-muted)" }}>
            No history available.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--att-border)", textAlign: "left" }}>
                <th style={{ padding: "0.75rem", color: "var(--att-text-muted)", fontWeight: "500" }}>Employee</th>
                <th style={{ padding: "0.75rem", color: "var(--att-text-muted)", fontWeight: "500" }}>Leave Type</th>
                <th style={{ padding: "0.75rem", color: "var(--att-text-muted)", fontWeight: "500" }}>Duration</th>
                <th style={{ padding: "0.75rem", color: "var(--att-text-muted)", fontWeight: "500" }}>Days</th>
                <th style={{ padding: "0.75rem", color: "var(--att-text-muted)", fontWeight: "500" }}>Status</th>
                <th style={{ padding: "0.75rem", color: "var(--att-text-muted)", fontWeight: "500" }}>Attachment</th>
              </tr>
            </thead>
            <tbody>
              {historyRequests.reverse().map(history => (
                <tr key={history.id} style={{ borderBottom: "1px solid var(--att-border)" }}>
                  <td style={{ padding: "0.75rem" }}>{history.employeeName}</td>
                  <td style={{ padding: "0.75rem" }}>{history.leaveType}</td>
                  <td style={{ padding: "0.75rem" }}>{new Date(history.startDate).toLocaleDateString()} - {new Date(history.endDate).toLocaleDateString()}</td>
                  <td style={{ padding: "0.75rem" }}>{history.totalDays}</td>
                  <td style={{ padding: "0.75rem" }}>
                    <span style={{ 
                      padding: "0.25rem 0.5rem", 
                      borderRadius: "99px", 
                      fontSize: "0.85rem",
                      fontWeight: "500",
                      background: history.status === "APPROVED" ? "#dcfce7" : "#fee2e2",
                      color: history.status === "APPROVED" ? "#166534" : "#991b1b"
                    }}>
                      {history.status}
                    </span>
                  </td>
                  <td style={{ padding: "0.75rem" }}>
                    {history.evidenceUrl ? (
                      <a href={history.evidenceUrl} target="_blank" rel="noreferrer" style={{ color: "var(--att-primary)", textDecoration: "underline", fontSize: "0.875rem" }}>
                        View
                      </a>
                    ) : (
                      <span style={{ color: "var(--att-text-muted)", fontSize: "0.875rem" }}>-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
