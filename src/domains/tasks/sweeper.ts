import { db } from "@/db";
import { taskInstances, taskEscalationMatrices, taskAuditLogs } from "@/db/schema";
import { eq, and, lt, inArray } from "drizzle-orm";

export async function runEscalationSweeper() {
  const now = new Date();

  // Find all pending tasks that are overdue
  const overdueTasks = await db.select()
    .from(taskInstances)
    .where(
      and(
        eq(taskInstances.status, "pending"),
        lt(taskInstances.dueAt, now)
      )
    );

  if (overdueTasks.length === 0) {
    return { success: true, escalatedCount: 0 };
  }

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
      // Calculate new due date based on the matrix timeout
      const newDueAt = new Date(now.getTime() + (nextMatrix.timeoutMinutes * 60 * 1000));

      // Update the task to the next level
      await db.update(taskInstances)
        .set({
          escalationLevel: nextLevel,
          assignedRoleId: nextMatrix.roleId, // Reassign to escalation role
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
          newRoleId: nextMatrix.roleId,
          timeoutMinutes: nextMatrix.timeoutMinutes
        }
      });

      escalatedCount++;
    } else {
      // Max escalation reached. We mark it as 'audit_pending'
      await db.update(taskInstances)
        .set({
          status: "audit_pending",
          updatedAt: now
        })
        .where(eq(taskInstances.id, task.id));
        
      await db.insert(taskAuditLogs).values({
        organizationId: task.organizationId,
        taskInstanceId: task.id,
        action: "max_escalation_reached",
        metadata: { finalLevel: currentLevel }
      });
    }
  }

  return { success: true, escalatedCount };
}
