"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getSessionContext } from "@/domains/session/service";
import { db } from "@/db";
import { 
  employees, 
  people, 
  rawBiometricPunches, 
  employeeLeaveBalances, 
  leaveTypes,
  taskInstances,
  taskDefinitions,
  businessRoles,
  authUsers
} from "@/db/schema";
import { eq, and, desc, gte, lte, or, inArray } from "drizzle-orm";
import { getEffectiveUserAuthority } from "@/domains/session/delegationAuthority";

export interface EmployeeDashboardPulse {
  employee: {
    id: string;
    employeeCode: string;
    displayName: string;
    jobTitle?: string | null;
    photoUrl?: string | null;
  };
  attendanceToday: {
    status: "PUNCHED_IN" | "PUNCHED_OUT" | "ON_BREAK" | "NOT_PUNCHED";
    firstPunchIn?: string | null;
    lastPunchOut?: string | null;
    totalPunchesCount: number;
    punches: { punchType: string; time: string }[];
  };
  leaveSummary: {
    leaveTypeName: string;
    closingBalance: string;
    isPaid?: boolean;
    allowZeroBalance?: boolean;
  }[];
  assignedTasks: {
    id: string;
    title: string;
    priority: "HIGH" | "MEDIUM" | "LOW" | "NORMAL";
    status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE";
    dueAt?: string | null;
    dueText?: string | null;
    actionUrl?: string | null;
    actionLabel?: string | null;
  }[];
}

export async function fetchEmployeePersonalPulse(params?: {
  organizationId?: string;
  locationId?: string;
}): Promise<{
  success: boolean;
  isExecutive: boolean;
  data?: EmployeeDashboardPulse | null;
  error?: string;
}> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return { success: false, isExecutive: false, error: "Unauthorized" };
    }

    const context = await getSessionContext(session.user);
    const primaryScope = context.scopes[0];
    const organizationId = params?.organizationId || primaryScope?.organizationId;
    const locationId = params?.locationId || primaryScope?.locationId;

    if (!organizationId) {
      return { success: false, isExecutive: false, error: "No organization context" };
    }

    // Check if user has executive perimeter privileges:
    // isOwner OR has branch executive / overview / reports / financial management permissions
    const activeScope = context.scopes.find(
      s => s.organizationId === organizationId && (!locationId || s.locationId === locationId)
    ) || primaryScope;

    const permissions = activeScope?.permissions || [];
    const isExecutive = Boolean(
      context.isOwner ||
      permissions.includes("dashboard.executive:view") ||
      permissions.includes("purchasing.po:authorize") ||
      permissions.includes("finance.audit:execute") ||
      permissions.includes("attendance.reports:view") ||
      permissions.includes("attendance.overview:read")
    );

    // 1. Fetch employee record for current user
    const [emp] = await db
      .select({
        id: employees.id,
        employeeCode: employees.employeeCode,
        jobTitle: employees.jobTitle,
        photoUrl: employees.photoUrl,
        personFirstName: people.firstName,
        personLastName: people.lastName,
        personDisplayName: people.displayName,
      })
      .from(employees)
      .innerJoin(people, eq(people.id, employees.personId))
      .where(
        and(
          eq(employees.userId, session.user.id),
          eq(employees.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!emp) {
      // If user is executive without employee profile, return isExecutive = true
      return { success: true, isExecutive, data: null };
    }

    const displayName = emp.personDisplayName || `${emp.personFirstName} ${emp.personLastName || ""}`.trim() || emp.employeeCode;

    // 2. Fetch today's punches for this employee
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const punches = await db
      .select({
        punchTime: rawBiometricPunches.punchTimestamp,
        punchType: rawBiometricPunches.punchType,
      })
      .from(rawBiometricPunches)
      .where(
        and(
          eq(rawBiometricPunches.employeeId, emp.id),
          gte(rawBiometricPunches.punchTimestamp, todayStart),
          lte(rawBiometricPunches.punchTimestamp, todayEnd)
        )
      )
      .orderBy(rawBiometricPunches.punchTimestamp);

    let punchStatus: "PUNCHED_IN" | "PUNCHED_OUT" | "ON_BREAK" | "NOT_PUNCHED" = "NOT_PUNCHED";
    let firstPunchIn: string | null = null;
    let lastPunchOut: string | null = null;

    if (punches.length > 0) {
      const inPunch = punches.find(p => p.punchType === "PUNCH_IN");
      if (inPunch) {
        firstPunchIn = new Date(inPunch.punchTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
      }

      const last = punches[punches.length - 1];
      if (last.punchType === "PUNCH_IN" || last.punchType === "BREAK_OUT") {
        punchStatus = "PUNCHED_IN";
      } else if (last.punchType === "BREAK_IN") {
        punchStatus = "ON_BREAK";
      } else if (last.punchType === "PUNCH_OUT") {
        punchStatus = "PUNCHED_OUT";
        lastPunchOut = new Date(last.punchTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
      }
    }

    // 3. Fetch leave balances summary
    const balances = await db
      .select({
        leaveTypeName: leaveTypes.name,
        closingBalance: employeeLeaveBalances.closingBalance,
        isPaid: leaveTypes.isPaid,
        allowZeroBalance: leaveTypes.allowZeroBalance,
      })
      .from(employeeLeaveBalances)
      .leftJoin(leaveTypes, eq(employeeLeaveBalances.leaveTypeId, leaveTypes.id))
      .where(eq(employeeLeaveBalances.employeeId, emp.id))
      .limit(6);

    // 4. Fetch personal assigned tasks today
    const authority = await getEffectiveUserAuthority(session.user.id, organizationId);
    let userRoleIds: string[] = authority.effectiveRoleIds || [];

    const { employeeRoleAssignments } = await import("@/db/schema");
    const roleRows = await db
      .select({ roleId: employeeRoleAssignments.roleId })
      .from(employeeRoleAssignments)
      .where(
        and(
          eq(employeeRoleAssignments.employeeId, emp.id),
          eq(employeeRoleAssignments.isActive, true)
        )
      );
    userRoleIds = [...new Set([...userRoleIds, ...roleRows.map(r => r.roleId)])];

    const taskConditions = [
      eq(taskInstances.organizationId, organizationId),
      eq(taskInstances.status, "pending")
    ];

    if (userRoleIds.length > 0) {
      taskConditions.push(
        or(
          eq(taskInstances.assignedUserId, session.user.id),
          inArray(taskInstances.assignedRoleId, userRoleIds)
        )!
      );
    } else {
      taskConditions.push(eq(taskInstances.assignedUserId, session.user.id));
    }

    const taskRows = await db
      .select({
        instance: taskInstances,
        definition: taskDefinitions,
      })
      .from(taskInstances)
      .innerJoin(taskDefinitions, eq(taskInstances.definitionId, taskDefinitions.id))
      .where(and(...taskConditions))
      .orderBy(desc(taskInstances.createdAt))
      .limit(10);

    const now = Date.now();
    const assignedTasks = taskRows.map(({ instance, definition }) => {
      const ctx: any = instance.contextData || {};
      const dueTime = instance.dueAt ? new Date(instance.dueAt).getTime() : null;
      const isOverdue = dueTime ? dueTime < now : false;

      let dueText: string | null = null;
      if (instance.dueAt) {
        dueText = new Date(instance.dueAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
      }

      const priorityMap: Record<string, "HIGH" | "MEDIUM" | "LOW" | "NORMAL"> = {
        HIGH: "HIGH",
        MEDIUM: "MEDIUM",
        LOW: "LOW",
        NORMAL: "NORMAL"
      };

      return {
        id: instance.id,
        title: ctx.title || definition.title,
        priority: priorityMap[definition.priority] || "NORMAL",
        status: (isOverdue ? "OVERDUE" : (instance.status as any)) || "PENDING",
        dueAt: instance.dueAt ? instance.dueAt.toISOString() : null,
        dueText,
        actionUrl: ctx.actionUrl || (definition.contextTemplate as any)?.actionUrl || `/tasks`,
        actionLabel: ctx.actionLabel || (definition.contextTemplate as any)?.actionLabel || "View Task",
      };
    });

    return {
      success: true,
      isExecutive,
      data: {
        employee: {
          id: emp.id,
          employeeCode: emp.employeeCode,
          displayName,
          jobTitle: emp.jobTitle,
          photoUrl: emp.photoUrl,
        },
        attendanceToday: {
          status: punchStatus,
          firstPunchIn,
          lastPunchOut,
          totalPunchesCount: punches.length,
          punches: punches.map(p => ({
            punchType: p.punchType,
            time: new Date(p.punchTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
          }))
        },
        leaveSummary: balances.map(b => ({
          leaveTypeName: b.leaveTypeName || "Leave",
          closingBalance: b.closingBalance || "0",
          isPaid: b.isPaid ?? true,
          allowZeroBalance: b.allowZeroBalance ?? false,
        })),
        assignedTasks,
      }
    };
  } catch (err: any) {
    console.error("fetchEmployeePersonalPulse error:", err);
    return { success: false, isExecutive: false, error: err.message };
  }
}
