import React from "react";
import { AppShell } from "@/components/AppShell";
import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { leaveRequests, employees, leaveTypes, people } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import ApprovalList from "@/components/attendance/ApprovalList";
import { GlobalModulesGrid } from "@/components/GlobalModulesGrid";
import { ActionRequiredBanner } from "@/components/ui/ActionRequiredBanner";
import { fetchGlobalPendingTasks } from "@/app/actions/pending-tasks";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  const params = await searchParams;
  const qs = new URLSearchParams(params).toString();
  const queryString = qs ? `?${qs}` : "";
  
  const organizationId = params?.organizationId;
  const locationId = params?.locationId;

  // Fetch pending operational actions (PO approvals, shift audits, finance queue)
  const pendingTasksRes = await fetchGlobalPendingTasks({ organizationId, locationId });
  const pendingTasks = pendingTasksRes.success ? pendingTasksRes.tasks : [];

  let rawRequests: any[] = [];
  
  if (session?.user) {
    // Fetch the employee record for the current user
    const currentEmployee = await db.select().from(employees).where(eq(employees.userId, session.user.id)).limit(1);
    
    if (currentEmployee.length > 0) {
      let conditions = and(
        eq(leaveRequests.status, "PENDING"),
        eq(leaveRequests.approverId, currentEmployee[0].id)
      );

      rawRequests = await db.select({
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
    }
  }

  return (
    <AppShell>
      <div className="kalki-page">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
        
        {/* Urgent Operations & Approvals (Global Pending Tasks) */}
        {pendingTasks.length > 0 && (
          <ActionRequiredBanner initialTasks={pendingTasks} />
        )}

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "2rem" }}>
          {/* Left Column: Pending Approvals */}
          <div>
            <h2 className="text-xl font-semibold mb-4" style={{ color: "var(--att-primary)" }}>Pending Leave Approvals</h2>
            {rawRequests.length > 0 ? (
              <div className="att-card">
                <ApprovalList requests={rawRequests} />
              </div>
            ) : (
              <div className="att-card" style={{ padding: "2rem", textAlign: "center", color: "var(--att-text-muted)" }}>
                You have no pending leave approvals.
              </div>
            )}
          </div>

          {/* Right Column: Quick Links */}
          <div>
            <h2 className="text-xl font-semibold mb-4" style={{ color: "var(--att-primary)" }}>Modules</h2>
            <GlobalModulesGrid />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
