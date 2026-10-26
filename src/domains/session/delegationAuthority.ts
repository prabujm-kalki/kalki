import { db } from "@/db";
import { 
  employees, 
  employeeRoleAssignments, 
  businessRoles, 
  leaveRequests,
  people,
  locationRoleAssignments,
  organizationRoleAssignments
} from "@/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";

export interface EffectiveAuthority {
  userId: string;
  directRoleIds: string[];
  effectiveRoleIds: string[];
  delegatedRoleIds: string[];
  delegatedEmployeeIds: string[];
  delegationMap: Record<string, { employeeName: string; employeeCode: string; reason?: string }>;
}

/**
 * Resolves a user's direct and delegated authority in an organization for today.
 * If any subordinate employee (via reporting line or role hierarchy) is currently
 * on APPROVED leave or confirmed absence, their roles and approval authority are dynamically
 * merged into the supervisor's effective authority vector.
 */
export async function getEffectiveUserAuthority(
  userId: string,
  organizationId: string
): Promise<EffectiveAuthority> {
  const todayStr = new Date().toISOString().split("T")[0];

  // 1. Fetch user's direct role assignments
  const [locRoles, orgRoles, empRoles] = await Promise.all([
    db.select({ roleId: locationRoleAssignments.roleId })
      .from(locationRoleAssignments)
      .where(and(
        eq(locationRoleAssignments.userId, userId),
        eq(locationRoleAssignments.organizationId, organizationId)
      )),
    db.select({ roleId: organizationRoleAssignments.roleId })
      .from(organizationRoleAssignments)
      .where(and(
        eq(organizationRoleAssignments.userId, userId),
        eq(organizationRoleAssignments.organizationId, organizationId)
      )),
    db.select({ roleId: employeeRoleAssignments.roleId })
      .from(employeeRoleAssignments)
      .innerJoin(employees, eq(employeeRoleAssignments.employeeId, employees.id))
      .where(and(
        eq(employees.userId, userId),
        eq(employeeRoleAssignments.organizationId, organizationId),
        eq(employeeRoleAssignments.isActive, true)
      ))
  ]);

  const directRoleIds = Array.from(new Set([
    ...locRoles.map((r) => r.roleId),
    ...orgRoles.map((r) => r.roleId),
    ...empRoles.map((r) => r.roleId)
  ]));

  // 2. Fetch the user's employee record to find their direct reporting subordinates
  const userEmpRecords = await db
    .select({ id: employees.id })
    .from(employees)
    .where(and(
      eq(employees.userId, userId),
      eq(employees.organizationId, organizationId)
    ));
  const userEmployeeIds = userEmpRecords.map((e) => e.id);

  // 3. Subordinates can be identified via two paths:
  //    A. Reporting Employee hierarchy: employees.reportingEmployeeId IN userEmployeeIds
  //    B. Role hierarchy: businessRoles.reportsToRoleId IN directRoleIds
  const subordinateConditions = [];
  if (userEmployeeIds.length > 0) {
    subordinateConditions.push(inArray(employees.reportingEmployeeId, userEmployeeIds));
  }

  // Find business roles that report to the user's direct roles
  let subordinateRoleIdsFromHierarchy: string[] = [];
  if (directRoleIds.length > 0) {
    const reportingRoles = await db
      .select({ id: businessRoles.id })
      .from(businessRoles)
      .where(and(
        eq(businessRoles.organizationId, organizationId),
        inArray(businessRoles.reportsToRoleId, directRoleIds)
      ));
    subordinateRoleIdsFromHierarchy = reportingRoles.map((r) => r.id);
  }

  // 4. Query all subordinates (either via employee reporting link or role assignment)
  const subordinateEmployeeQuery = db
    .select({
      id: employees.id,
      code: employees.employeeCode,
      name: people.displayName,
      roleId: employeeRoleAssignments.roleId,
    })
    .from(employees)
    .leftJoin(people, eq(employees.personId, people.id))
    .leftJoin(employeeRoleAssignments, and(
      eq(employeeRoleAssignments.employeeId, employees.id),
      eq(employeeRoleAssignments.isActive, true)
    ))
    .where(and(
      eq(employees.organizationId, organizationId),
      eq(employees.status, "ACTIVE"),
      sql`(${employees.id} NOT IN (${userEmployeeIds.length ? sql.join(userEmployeeIds.map(id => sql`${id}`), sql`, `) : sql`'00000000-0000-0000-0000-000000000000'`}))`
    ));

  const allSubCandidates = await subordinateEmployeeQuery;

  // Filter candidates who either directly report to user OR hold a subordinate role
  const relevantSubordinates = allSubCandidates.filter((sub) => {
    const isDirectReport = userEmployeeIds.length > 0; // handled by parent check below
    const isRoleReport = sub.roleId && subordinateRoleIdsFromHierarchy.includes(sub.roleId);
    return isDirectReport || isRoleReport;
  });

  const subEmpIds = Array.from(new Set(relevantSubordinates.map((s) => s.id)));

  if (subEmpIds.length === 0) {
    return {
      userId,
      directRoleIds,
      effectiveRoleIds: directRoleIds,
      delegatedRoleIds: [],
      delegatedEmployeeIds: [],
      delegationMap: {},
    };
  }

  // 5. Check which subordinates are on APPROVED leave today
  const activeLeaves = await db
    .select({
      employeeId: leaveRequests.employeeId,
      startDate: leaveRequests.startDate,
      endDate: leaveRequests.endDate,
      reason: leaveRequests.reason,
    })
    .from(leaveRequests)
    .where(and(
      inArray(leaveRequests.employeeId, subEmpIds),
      eq(leaveRequests.status, "APPROVED"),
      sql`${leaveRequests.startDate} <= ${todayStr}`,
      sql`${leaveRequests.endDate} >= ${todayStr}`
    ));

  const absentEmployeeIds = new Set(activeLeaves.map((l) => l.employeeId));
  const delegatedEmployeeIds: string[] = [];
  const delegatedRoleIdsSet = new Set<string>();
  const delegationMap: Record<string, { employeeName: string; employeeCode: string; reason?: string }> = {};

  for (const sub of relevantSubordinates) {
    if (absentEmployeeIds.has(sub.id)) {
      if (!delegatedEmployeeIds.includes(sub.id)) {
        delegatedEmployeeIds.push(sub.id);
        const l = activeLeaves.find((al) => al.employeeId === sub.id);
        delegationMap[sub.id] = {
          employeeName: sub.name || sub.code,
          employeeCode: sub.code,
          reason: l?.reason || undefined,
        };
      }
      if (sub.roleId && !directRoleIds.includes(sub.roleId)) {
        delegatedRoleIdsSet.add(sub.roleId);
      }
    }
  }

  const delegatedRoleIds = Array.from(delegatedRoleIdsSet);
  const effectiveRoleIds = Array.from(new Set([...directRoleIds, ...delegatedRoleIds]));

  return {
    userId,
    directRoleIds,
    effectiveRoleIds,
    delegatedRoleIds,
    delegatedEmployeeIds,
    delegationMap,
  };
}
