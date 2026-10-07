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
import { RegularizationRequestForm } from "./RegularizationRequestForm";

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
    <div style={{ width: "100%", padding: "0" }}>
      <header className="att-header" style={{ marginBottom: "1rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 className="att-title" style={{ fontSize: "1.25rem", margin: "0 0 0.15rem 0", fontWeight: "600" }}>My Time & Attendance</h1>
          <p className="att-subtitle" style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: 0 }}>View leave balances and manage time-off requests.</p>
        </div>
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
        <RegularizationRequestForm />
        <LeaveHistoryTable requests={mergedHistory as any} />
      </div>
    </div>
  );
}
