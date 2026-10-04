import { db } from "@/db";
import { taskInstances, taskEscalationMatrices, taskAuditLogs, taskDefinitions } from "@/db/schema";
import { eq, and, lt, inArray } from "drizzle-orm";

export async function runEscalationSweeper() {
  const now = new Date();

  // ==========================================
  // ==========================================
  // STAGE 0: Warning Dispatch
  // ==========================================
  const activeTasksForWarning = await db.select({
      instance: taskInstances,
      warningThresholdMins: taskDefinitions.warningThresholdMins
    })
    .from(taskInstances)
    .innerJoin(taskDefinitions, eq(taskInstances.definitionId, taskDefinitions.id))
    .where(inArray(taskInstances.status, ["pending", "in_progress"]));

  let warningsSent = 0;
  for (const { instance, warningThresholdMins } of activeTasksForWarning) {
    if (!instance.dueAt) continue;
    const ctx: any = instance.contextData || {};
    
    // Skip if warning already sent or task already escalated
    if (ctx.warningSent || instance.escalationLevel > 0) continue;

    const finalWarningMins = ctx.warningThresholdMins ?? warningThresholdMins ?? 10;
    const thresholdMs = finalWarningMins * 60 * 1000;
    const warningTime = new Date(instance.dueAt.getTime() - thresholdMs);

    // To prevent node-cron millisecond jitter from skipping the warning window 
    // (e.g. running at :00.000 when warning is at :00.013), we add a 5-second forward tolerance.
    const isPastWarning = now.getTime() + 5000 >= warningTime.getTime();

    // If we have crossed the warning time, but haven't breached the deadline yet
    if (isPastWarning && now < instance.dueAt) {
      ctx.warningSent = true;
      ctx.isWarning = true; // For UI to display the warning box
      
      await db.update(taskInstances)
        .set({ contextData: ctx, updatedAt: now })
        .where(eq(taskInstances.id, instance.id));
        
      warningsSent++;
    }
  }
    
  // ==========================================
  // STAGE 1: Assignee Deadline Breach 
  // ==========================================
  // Find all pending or in_progress tasks that are overdue
  const overdueTasks = await db.select()
    .from(taskInstances)
    .where(
      and(
        inArray(taskInstances.status, ["pending", "in_progress"]),
        lt(taskInstances.dueAt, now)
      )
    );

  let escalatedCount = 0;

  for (const task of overdueTasks) {
    const currentLevel = task.escalationLevel || 0;
    const nextLevel = currentLevel + 1;

    // Look for the next escalation rule
    const [nextMatrix] = await db.select()
      .from(taskEscalationMatrices)
      .where(
        and(
          eq(taskEscalationMatrices.definitionId, task.definitionId),
          eq(taskEscalationMatrices.level, nextLevel)
        )
      );

    if (nextMatrix) {
      let finalRoleId = nextMatrix.roleId;
      let finalUserId = nextMatrix.userId; // Usually null, but good for completeness

      let shouldEscalateToManager = nextMatrix.escalateToReportingManager;
      if (finalRoleId === "REPORTING_MANAGER") {
        shouldEscalateToManager = true;
        finalRoleId = null;
      }

      // DYNAMIC REPORTING MANAGER LOOKUP
      // If explicitly requested OR if the matrix is broken/empty, default to escalating to manager
      if (shouldEscalateToManager || (!finalRoleId && !finalUserId)) {
        const { businessRoles, employeeRoleAssignments, employees } = await import("@/db/schema");
        
        let targetRoleId = task.assignedRoleId;

        // If no role was assigned directly to the task, try to find the user's role
        if (!targetRoleId && task.assignedUserId) {
          const userEmp = await db.select({ id: employees.id })
            .from(employees)
            .where(eq(employees.userId, task.assignedUserId))
            .limit(1)
            .then(res => res[0]);

          if (userEmp) {
            const roleAssignment = await db.select({ roleId: employeeRoleAssignments.roleId })
              .from(employeeRoleAssignments)
              .where(and(eq(employeeRoleAssignments.employeeId, userEmp.id), eq(employeeRoleAssignments.isActive, true)))
              .limit(1)
              .then(res => res[0]);
            
            if (roleAssignment) {
              targetRoleId = roleAssignment.roleId;
            }
          }
        }

        if (targetRoleId) {
          const role = await db.select({ reportsToRoleId: businessRoles.reportsToRoleId })
            .from(businessRoles)
            .where(eq(businessRoles.id, targetRoleId))
            .limit(1)
            .then(res => res[0]);

          if (role?.reportsToRoleId) {
            finalRoleId = role.reportsToRoleId;
            finalUserId = null; // Escalate to the role queue
          }
        }
      }

      // FALLBACK: If we still have NO ONE to escalate to, DO NOT wipe out the current assignment!
      if (!finalRoleId && !finalUserId) {
        finalRoleId = task.assignedRoleId;
        finalUserId = task.assignedUserId;
      }

      // Calculate new due date based on the matrix timeout
      const newDueAt = new Date(now.getTime() + (nextMatrix.timeoutMinutes * 60 * 1000));

      // Update the task to the next level
      await db.update(taskInstances)
        .set({
          escalationLevel: nextLevel,
          assignedRoleId: finalRoleId,
          assignedUserId: finalUserId,
          dueAt: newDueAt,
          updatedAt: now
        })
        .where(eq(taskInstances.id, task.id));

      // Log the escalation in audit logs
      await db.insert(taskAuditLogs).values({
        organizationId: task.organizationId,
        taskInstanceId: task.id,
        action: "escalated",
        metadata: {
          previousLevel: currentLevel,
          newLevel: nextLevel,
          newRoleId: finalRoleId,
          newUserId: finalUserId,
          timeoutMinutes: nextMatrix.timeoutMinutes
        }
      });
    } else {
      // Max escalation reached or no matrix. We mark it as 'audit_pending' and escalate to reporting manager
      const ctx: any = task.contextData || {};
      ctx.escalated = true;
      ctx.escalationReason = "Deadline missed by Assignee";

      const { businessRoles, employeeRoleAssignments, employees } = await import("@/db/schema");
      let targetRoleId = task.assignedRoleId;
      
      if (!targetRoleId && task.assignedUserId) {
        const userEmp = await db.select({ id: employees.id })
          .from(employees)
          .where(eq(employees.userId, task.assignedUserId))
          .limit(1)
          .then(res => res[0]);

        if (userEmp) {
          const roleAssignment = await db.select({ roleId: employeeRoleAssignments.roleId })
            .from(employeeRoleAssignments)
            .where(and(eq(employeeRoleAssignments.employeeId, userEmp.id), eq(employeeRoleAssignments.isActive, true)))
            .limit(1)
            .then(res => res[0]);
          
          if (roleAssignment) targetRoleId = roleAssignment.roleId;
        }
      }

      let newRoleId = task.assignedRoleId;
      let newUserId = task.assignedUserId;

      if (targetRoleId) {
        const role = await db.select({ reportsToRoleId: businessRoles.reportsToRoleId })
          .from(businessRoles)
          .where(eq(businessRoles.id, targetRoleId))
          .limit(1)
          .then(res => res[0]);

        if (role?.reportsToRoleId) {
          newRoleId = role.reportsToRoleId;
          newUserId = null; // Send to manager's role queue
        }
      }

      await db.update(taskInstances)
        .set({
          status: "audit_pending",
          assignedRoleId: newRoleId,
          assignedUserId: newUserId,
          contextData: ctx,
          updatedAt: now
        })
        .where(eq(taskInstances.id, task.id));
        
      await db.insert(taskAuditLogs).values({
        organizationId: task.organizationId,
        taskInstanceId: task.id,
        action: "max_escalation_reached",
        metadata: { 
          finalLevel: currentLevel, 
          reason: ctx.escalationReason,
          escalatedToRoleId: newRoleId
        }
      });
    }
    escalatedCount++;
  }

  // ==========================================
  // STAGE 2: Auditor Grace Period Breach
  // ==========================================
  // If a manager ignores an audit for > 24 hours, automatically push to next hierarchy level.
  const gracePeriodHours = 24;
  const gracePeriodMs = gracePeriodHours * 60 * 60 * 1000;
  const graceCutoff = new Date(now.getTime() - gracePeriodMs);

  const stagnantAudits = await db.select().from(taskInstances)
    .where(and(
      eq(taskInstances.status, 'audit_pending'),
      lt(taskInstances.updatedAt, graceCutoff)
    ));

  let escalatedAuditCount = 0;

  for (const t of stagnantAudits) {
    const ctx: any = t.contextData || {};
    const currentAuditLevel = ctx.auditLevel || 1;
    const newAuditLevel = currentAuditLevel + 1;
    
    ctx.auditLevel = newAuditLevel;
    ctx.escalationReason = `Auditor ignored task for > ${gracePeriodHours} hours. Escalated to Level ${newAuditLevel}`;
    ctx.escalated = true;
    
    await db.update(taskInstances).set({
      contextData: ctx,
      updatedAt: now // Reset the timer so Level 2 gets 24 hours to respond
    }).where(eq(taskInstances.id, t.id));
    
    escalatedAuditCount++;
  }

  return { 
    success: true, 
    escalatedMissedTasks: escalatedCount,
    escalatedStagnantAudits: escalatedAuditCount
  };
}
