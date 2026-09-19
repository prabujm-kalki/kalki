import { NextResponse } from "next/server";
import { db } from "@/db";
import { employees, people, businessRoles, employeeRoleAssignments } from "@/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";
import { requireAuthenticatedUser } from "@/lib/authorization";
import { getOrganizationForUser } from "@/lib/get-organization-for-user";

const roleHierarchy: Record<string, number> = {
  owner: 100,
  manager: 90,
  hr: 80,
  supervisor: 80,
  kitchen_in_charge: 70,
  cashier: 60,
  service_team: 60,
  kitchen_team: 60,
  others: 50,
};

export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const organizationId = await getOrganizationForUser(user.id);
    if (!organizationId) return NextResponse.json({ error: "No organization found" }, { status: 400 });
    
    const url = new URL(request.url);
    const roleIds = url.searchParams.getAll("roleId");

    let highestNewRoleLevel = 0;
    if (roleIds.length > 0) {
      const selectedRoles = await db
        .select({ identifier: businessRoles.identifier })
        .from(businessRoles)
        .where(inArray(businessRoles.id, roleIds));
      
      for (const role of selectedRoles) {
        const level = roleHierarchy[role.identifier ?? ""] ?? 0;
        if (level > highestNewRoleLevel) {
          highestNewRoleLevel = level;
        }
      }
    }

    const candidatesRows = await db
      .select({
        id: employees.id,
        displayName: people.displayName,
        jobTitle: employees.jobTitle,
        employeeCode: employees.employeeCode,
        roleIdentifier: businessRoles.identifier,
      })
      .from(employees)
      .innerJoin(people, eq(people.id, employees.personId))
      .innerJoin(employeeRoleAssignments, eq(employeeRoleAssignments.employeeId, employees.id))
      .innerJoin(businessRoles, eq(businessRoles.id, employeeRoleAssignments.roleId))
      .where(
        and(
          eq(employees.organizationId, organizationId),
          eq(employees.status, "ACTIVE"),
          eq(employeeRoleAssignments.isActive, true),
          url.searchParams.get("excludeEmployeeId") ? sql`${employees.id} != ${url.searchParams.get("excludeEmployeeId")}` : undefined
        )
      );

    const candidatesMap = new Map();
    for (const row of candidatesRows) {
      const level = roleHierarchy[row.roleIdentifier ?? ""] ?? 0;
      if (level > highestNewRoleLevel) {
        candidatesMap.set(row.id, {
          id: row.id,
          displayName: row.displayName,
          jobTitle: row.jobTitle,
          employeeCode: row.employeeCode,
        });
      }
    }

    const eligibleCandidates = Array.from(candidatesMap.values());
    
    return NextResponse.json({ candidates: eligibleCandidates }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch candidates" }, { status: 500 });
  }
}
