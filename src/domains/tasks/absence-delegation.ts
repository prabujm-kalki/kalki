import { db } from "@/db";
import { 
  employees, 
  employeeRoleAssignments, 
  businessRoles, 
  taskInstances, 
  taskAuditLogs,
  purchaseOrders,
  leaveRequests 
} from "@/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";

/**
 * Automatically reassigns or delegates pending tasks for an employee on approved leave or absence.
 * When an employee is marked absent or their leave request is approved, their active operational tasks
 * and reviews are routed to their designated reporting supervisor / manager.
 */
export async function reassignPendingTasksForAbsentEmployee(params: {
  employeeId: string;
  organizationId: string;
  reason?: string;
  actorUserId?: string;
}): Promise<{ success: boolean; reassignedCount: number; targetRoleName?: string; error?: string }> {
  try {
    const { employeeId, organizationId, reason, actorUserId } = params;

    // 1. Fetch the employee and their user ID
    const [emp] = await db
      .select({
        id: employees.id,
        userId: employees.userId,
        locationId: employees.locationId,
        reportingEmployeeId: employees.reportingEmployeeId,
      })
      .from(employees)
      .where(and(eq(employees.id, employeeId), eq(employees.organizationId, organizationId)))
      .limit(1);

    if (!emp) {
      return { success: false, reassignedCount: 0, error: "Employee not found." };
    }

    // 2. Fetch employee's active role assignments
    const roleRows = await db
      .select({ roleId: employeeRoleAssignments.roleId })
      .from(employeeRoleAssignments)
      .where(and(
        eq(employeeRoleAssignments.employeeId, employeeId),
        eq(employeeRoleAssignments.isActive, true)
      ));

    const roleIds = roleRows.map((r) => r.roleId);

    // 3. Find the reporting supervisor's role
    let supervisorRoleId: string | null = null;
    let supervisorRoleName: string | null = null;

    if (roleIds.length > 0) {
      const bRoles = await db
        .select({
          id: businessRoles.id,
          name: businessRoles.name,
          reportsToRoleId: businessRoles.reportsToRoleId,
        })
        .from(businessRoles)
        .where(inArray(businessRoles.id, roleIds));

      for (const br of bRoles) {
        if (br.reportsToRoleId) {
          supervisorRoleId = br.reportsToRoleId;
          break;
        }
      }
    }

    // Fallback: If no direct reportsToRoleId found on business roles, check reportingEmployeeId
    let supervisorUserId: string | null = null;
    if (emp.reportingEmployeeId) {
      const [managerEmp] = await db
        .select({ userId: employees.userId })
        .from(employees)
        .where(eq(employees.id, emp.reportingEmployeeId))
        .limit(1);
      if (managerEmp?.userId) {
        supervisorUserId = managerEmp.userId;
      }
    }

    if (supervisorRoleId) {
      const [supRole] = await db
        .select({ name: businessRoles.name })
        .from(businessRoles)
        .where(eq(businessRoles.id, supervisorRoleId))
        .limit(1);
      if (supRole) supervisorRoleName = supRole.name;
    }

    if (!supervisorRoleId && !supervisorUserId) {
      return { 
        success: true, 
        reassignedCount: 0, 
        error: "No supervisor role or manager configured to receive delegated tasks." 
      };
    }

    let reassignedCount = 0;

    // 4. Fetch all active or pending audit task instances assigned to this user or role
    const taskConditions = [
      eq(taskInstances.organizationId, organizationId),
      inArray(taskInstances.status, ["pending", "in_progress", "audit_pending"]),
    ];

    if (emp.userId && roleIds.length > 0) {
      taskConditions.push(
        sql`(${taskInstances.assignedUserId} = ${emp.userId} OR ${taskInstances.assignedRoleId} IN ${roleIds})`
      );
    } else if (emp.userId) {
      taskConditions.push(eq(taskInstances.assignedUserId, emp.userId));
    } else if (roleIds.length > 0) {
      taskConditions.push(inArray(taskInstances.assignedRoleId, roleIds));
    }

    const tasksToReassign = await db
      .select({ id: taskInstances.id, contextData: taskInstances.contextData })
      .from(taskInstances)
      .where(and(...taskConditions));

    for (const t of tasksToReassign) {
      const ctx: any = t.contextData || {};
      ctx.delegatedFromEmployeeId = employeeId;
      ctx.delegatedReason = reason || "Primary assignee is on approved leave / absent.";
      ctx.isDelegated = true;

      await db
        .update(taskInstances)
        .set({
          assignedRoleId: supervisorRoleId || undefined,
          assignedUserId: supervisorUserId || undefined,
          contextData: ctx,
          updatedAt: new Date(),
        })
        .where(eq(taskInstances.id, t.id));

      await db.insert(taskAuditLogs).values({
        organizationId,
        taskInstanceId: t.id,
        actorUserId: actorUserId || null,
        action: "auto_delegated_absence",
        metadata: {
          originalEmployeeId: employeeId,
          supervisorRoleId,
          supervisorUserId,
          reason: ctx.delegatedReason,
        },
      });

      reassignedCount++;
    }

    return {
      success: true,
      reassignedCount,
      targetRoleName: supervisorRoleName || "Reporting Manager",
    };
  } catch (error: any) {
    console.error("reassignPendingTasksForAbsentEmployee error:", error);
    return {
      success: false,
      reassignedCount: 0,
      error: error?.message || "Failed to delegate tasks for absent employee.",
    };
  }
}
