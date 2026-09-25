import { db } from "@/db";
import { departments, businessRoles, employees, people } from "@/db/schema";
import { eq } from "drizzle-orm";
import ReportsClient from "@/components/attendance/ReportsClient";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/domains/session/service";

export default async function AttendanceReportsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/sign-in");
  }

  const context = await getSessionContext(session.user);
  
  // Basic initial auth check for rendering the page
  let hasReportsAccess = context.isOwner;
  if (!hasReportsAccess) {
    hasReportsAccess = context.scopes.some(s => s.permissions.includes("attendance.reports:view") || s.permissions.includes("attendance.reports:execute"));
  }

  if (!hasReportsAccess) {
    return (
      <div>
        <header className="att-header">
          <h1 className="att-title">Attendance Reports</h1>
          <p className="att-subtitle">Generate and export attendance data</p>
        </header>
        <div className="att-card">
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--att-text-muted)" }}>
            You do not have permission to view attendance reports.
          </div>
        </div>
      </div>
    );
  }

  // Fetch all possible departments and roles for filters
  const depts = await db.select({
    id: departments.id,
    name: departments.name
  }).from(departments);

  const rls = await db.select({
    id: businessRoles.id,
    title: businessRoles.name
  }).from(businessRoles);

  const emps = await db.select({
    id: employees.id,
    code: employees.employeeCode,
    name: people.displayName,
    organizationId: employees.organizationId,
    locationId: employees.locationId
  })
  .from(employees)
  .innerJoin(people, eq(employees.personId, people.id));

  return (
    <div>
      <header className="att-header">
        <h1 className="att-title">Attendance Reports</h1>
        <p className="att-subtitle">Filter, view, and export detailed biometric punch records across the organization.</p>
      </header>

      <ReportsClient 
        departments={depts}
        roles={rls}
        employees={emps}
      />
    </div>
  );
}
