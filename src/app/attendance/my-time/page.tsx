import { db } from "@/db";
import { employeeLeaveBalances, leaveRequests, leaveTypes, employees } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getSessionContext } from "@/domains/session/service";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { LeaveBalances } from "./LeaveBalances";
import { LeaveApplicationForm } from "./LeaveApplicationForm";
import { EncashmentApplicationForm } from "./EncashmentApplicationForm";
import { LeaveHistoryTable } from "./LeaveHistoryTable";

import { MyTimeTabs } from "./MyTimeTabs";

export default async function MyTimePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return redirect("/login");

  const context = await getSessionContext(session.user);
  if (!context.scopes.length) return redirect("/settings");
  
  // Assuming the user is operating in the first selected scope or pass scope info
  const scope = context.scopes[0];

  // Get Employee ID from the user's mapping
  const empList = await db.select().from(employees).where(
    and(eq(employees.userId, session.user.id), eq(employees.organizationId, scope.organizationId))
  );
  const employee = empList[0];

  if (!employee) {
    return (
      <div className="stack" style={{ padding: "2rem" }}>
        <h2>My Time</h2>
        <div className="att-card">
          <p>You do not have an active employee profile linked to your account.</p>
        </div>
      </div>
    );
  }

  const balancesData = await db.select({
    id: employeeLeaveBalances.id,
    leaveTypeId: employeeLeaveBalances.leaveTypeId,
    accrued: employeeLeaveBalances.accrued,
    taken: employeeLeaveBalances.taken,
    carriedForward: employeeLeaveBalances.carriedForward,
    closingBalance: employeeLeaveBalances.closingBalance,
    leaveTypeName: leaveTypes.name,
  })
  .from(employeeLeaveBalances)
  .leftJoin(leaveTypes, eq(employeeLeaveBalances.leaveTypeId, leaveTypes.id))
  .where(eq(employeeLeaveBalances.employeeId, employee.id));

  const historyData = await db.select({
    id: leaveRequests.id,
    leaveTypeName: leaveTypes.name,
    startDate: leaveRequests.startDate,
    endDate: leaveRequests.endDate,
    totalDays: leaveRequests.totalDays,
    status: leaveRequests.status,
    createdAt: leaveRequests.createdAt,
  })
  .from(leaveRequests)
  .leftJoin(leaveTypes, eq(leaveRequests.leaveTypeId, leaveTypes.id))
  .where(eq(leaveRequests.employeeId, employee.id));

  const { leaveEncashmentRequests } = await import("@/db/schema");
  const encashHistoryData = await db.select({
    id: leaveEncashmentRequests.id,
    leaveTypeName: leaveTypes.name,
    totalDays: leaveEncashmentRequests.encashmentDays,
    status: leaveEncashmentRequests.status,
    createdAt: leaveEncashmentRequests.createdAt,
  })
  .from(leaveEncashmentRequests)
  .leftJoin(leaveTypes, eq(leaveEncashmentRequests.leaveTypeId, leaveTypes.id))
  .where(eq(leaveEncashmentRequests.employeeId, employee.id));

  const mergedHistory = [
    ...historyData.map(h => ({
      ...h,
      leaveTypeName: h.leaveTypeName
    })),
    ...encashHistoryData.map(h => ({
      id: h.id,
      leaveTypeName: `${h.leaveTypeName} Encash`,
      startDate: h.createdAt,
      endDate: h.createdAt,
      totalDays: h.totalDays,
      status: h.status,
      createdAt: h.createdAt,
    }))
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const activeLeaveTypes = await db.select({
    id: leaveTypes.id,
    name: leaveTypes.name,
    isEncashable: leaveTypes.isEncashable,
  })
  .from(leaveTypes)
  .where(and(eq(leaveTypes.organizationId, scope.organizationId), eq(leaveTypes.isActive, true)));

  const locationId = scope.locationId;

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
      <header className="att-header" style={{ marginBottom: "2rem" }}>
        <h1 className="att-title" style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>My Time & Attendance</h1>
        <p className="att-subtitle" style={{ color: "var(--text-muted)" }}>View your leave balances and manage time-off requests.</p>
      </header>

      <LeaveBalances balances={balancesData as any} />

      <MyTimeTabs 
        leaveTypes={activeLeaveTypes}
        balances={balancesData as any}
        employeeId={employee.id}
        organizationId={scope.organizationId}
        locationId={locationId}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "2rem" }}>
        <LeaveHistoryTable requests={mergedHistory as any} />
      </div>
    </div>
  );
}
