"use server";

import { db } from "@/db";
import { 
  rawBiometricPunches, 
  employees, 
  people, 
  departments, 
  businessRoles,
  employeeRoleAssignments
} from "@/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getSessionContext } from "@/domains/session/service";

export type AttendanceReportFilters = {
  startDate: string;
  endDate: string;
  departmentId?: string;
  roleId?: string;
  employeeId?: string;
  organizationId: string;
  locationId: string;
};

export async function generateAttendanceReport(filters: AttendanceReportFilters) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) throw new Error("Unauthorized");
  
  const context = await getSessionContext(session.user);
  const scope = context.scopes.find(s => s.organizationId === filters.organizationId && s.locationId === filters.locationId);
  if (!scope && !context.isOwner) throw new Error("Forbidden");

  // Basic RBAC check
  if (!context.isOwner) {
    if (!scope?.permissions.includes("attendance.reports:view") && !scope?.permissions.includes("attendance.reports:execute")) {
      throw new Error("Forbidden: Missing reports view permission");
    }
  }

  const start = new Date(filters.startDate);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(filters.endDate);
  end.setHours(23, 59, 59, 999);

  let conditions = [
    eq(rawBiometricPunches.organizationId, filters.organizationId),
    eq(rawBiometricPunches.locationId, filters.locationId),
    gte(rawBiometricPunches.punchTimestamp, start),
    lte(rawBiometricPunches.punchTimestamp, end),
  ];

  if (filters.employeeId) {
    conditions.push(eq(rawBiometricPunches.employeeId, filters.employeeId));
  }
  
  // Create base query
  let query = db.select({
    id: rawBiometricPunches.id,
    punchType: rawBiometricPunches.punchType,
    punchTimestamp: rawBiometricPunches.punchTimestamp,
    sourceType: rawBiometricPunches.sourceType,
    snapshotUrl: rawBiometricPunches.snapshotUrl,
    employeeId: employees.id,
    employeeName: people.displayName,
    employeeCode: employees.employeeCode,
    departmentName: departments.name,
    roleTitle: businessRoles.name,
    departmentId: employees.departmentId,
    roleId: employeeRoleAssignments.roleId,
  })
  .from(rawBiometricPunches)
  .innerJoin(employees, eq(rawBiometricPunches.employeeId, employees.id))
  .innerJoin(people, eq(employees.personId, people.id))
  .leftJoin(departments, eq(employees.departmentId, departments.id))
  .leftJoin(employeeRoleAssignments, eq(employees.id, employeeRoleAssignments.employeeId))
  .leftJoin(businessRoles, eq(employeeRoleAssignments.roleId, businessRoles.id))
  .where(and(...conditions))
  .orderBy(desc(rawBiometricPunches.punchTimestamp));

  const results = await query;

  // Manual filtering for joined tables for flexibility
  let finalResults = results;
  
  if (filters.departmentId) {
    finalResults = finalResults.filter(r => r.departmentId === filters.departmentId);
  }
  if (filters.roleId) {
    finalResults = finalResults.filter(r => r.roleId === filters.roleId);
  }

  return finalResults.map(r => ({
    id: r.id,
    employeeId: r.employeeId,
    employeeName: r.employeeName,
    employeeCode: r.employeeCode,
    departmentName: r.departmentName,
    roleTitle: r.roleTitle,
    punchType: r.punchType,
    punchTimestamp: r.punchTimestamp,
    sourceType: r.sourceType,
    snapshotUrl: r.snapshotUrl,
  }));
}
