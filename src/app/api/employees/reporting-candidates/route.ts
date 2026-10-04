import { NextResponse } from "next/server";
import { db } from "@/db";
import { employees, people, businessRoles, employeeRoleAssignments } from "@/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";
import { requireAuthenticatedUser } from "@/lib/authorization";
import { getOrganizationForUser } from "@/lib/get-organization-for-user";



export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const organizationId = await getOrganizationForUser(user.id);
    if (!organizationId) return NextResponse.json({ error: "No organization found" }, { status: 400 });
    
    const url = new URL(request.url);
    const roleIds = url.searchParams.getAll("roleId");

    // 1. Fetch all roles to build the hierarchy tree
    const allRoles = await db
      .select({ id: businessRoles.id, reportsToRoleId: businessRoles.reportsToRoleId })
      .from(businessRoles)
      .where(eq(businessRoles.organizationId, organizationId));

    const roleMap = new Map<string, string | null>();
    allRoles.forEach(r => roleMap.set(r.id, r.reportsToRoleId));

    // 2. Determine all valid ancestor Role IDs
    const validAncestorRoleIds = new Set<string>();
    
    if (roleIds.length > 0) {
      for (const startRoleId of roleIds) {
        let currentRoleId = roleMap.get(startRoleId);
        const visited = new Set<string>(); // Prevent infinite loops
        
        while (currentRoleId && !visited.has(currentRoleId)) {
          visited.add(currentRoleId);
          validAncestorRoleIds.add(currentRoleId);
          currentRoleId = roleMap.get(currentRoleId);
        }
      }
    }

    // 3. Fetch candidates
    const candidatesRows = await db
      .select({
        id: employees.id,
        displayName: people.displayName,
        jobTitle: employees.jobTitle,
        employeeCode: employees.employeeCode,
        roleId: businessRoles.id,
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

    // 4. Filter candidates by ancestry
    const candidatesMap = new Map();
    for (const row of candidatesRows) {
      // If no roles are selected yet, ANY active employee can be a reporting manager.
      // If roles ARE selected, the candidate's role MUST be in the ancestor set.
      if (roleIds.length === 0 || validAncestorRoleIds.has(row.roleId)) {
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
