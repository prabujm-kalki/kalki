import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { taskInstances, taskAuditLogs, taskDefinitions } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: taskId } = await props.params;
    const body = await req.json();
    const { extensionPercentage = 100 } = body;

    const [taskRecord] = await db
      .select({
        instance: taskInstances,
        targetRoleId: taskDefinitions.targetRoleId,
        targetUserId: taskDefinitions.targetUserId,
        completionTimeMins: taskDefinitions.completionTimeMins
      })
      .from(taskInstances)
      .leftJoin(taskDefinitions, eq(taskInstances.definitionId, taskDefinitions.id))
      .where(eq(taskInstances.id, taskId))
      .limit(1);
    
    if (!taskRecord || !taskRecord.instance) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const task = taskRecord.instance;
    let originalRoleId = taskRecord.targetRoleId;
    let originalUserId = taskRecord.targetUserId;

    if (task.escalationLevel === 0) {
      return NextResponse.json({ error: "Only escalated tasks can be returned" }, { status: 400 });
    }

    // Smart fallback to find original assignment for generated tasks where definition doesn't hold it
    if (!originalRoleId && !originalUserId) {
      if ((task.contextData as any)?.scheduleId) {
        const { purchaseSchedules } = await import("@/db/schema");
        const [sched] = await db.select({ responsibleRoleId: purchaseSchedules.responsibleRoleId })
          .from(purchaseSchedules)
          .where(eq(purchaseSchedules.id, (task.contextData as any).scheduleId))
          .limit(1);
        if (sched?.responsibleRoleId) {
          originalRoleId = sched.responsibleRoleId;
        }
      }
    }

    const originalMins = taskRecord.completionTimeMins || 60; // Default to 60 if null
    const grantedMins = Math.round(originalMins * (extensionPercentage / 100));
    const newDueAt = new Date(Date.now() + (grantedMins * 60 * 1000));

    const updatePayload = {
      status: "in_progress", // Send back to the user
      updatedAt: new Date(),
      dueAt: newDueAt,
      assignedRoleId: originalRoleId || task.assignedRoleId, // Restore original role
      assignedUserId: originalUserId || task.assignedUserId, // Restore original user
      escalationLevel: 0 // Reset escalation so they get standard time again
    };

    // Update Task
    const [updated] = await db.update(taskInstances)
      .set(updatePayload as any)
      .where(eq(taskInstances.id, taskId))
      .returning();

    await db.insert(taskAuditLogs).values({
      organizationId: task.organizationId,
      taskInstanceId: task.id,
      actorUserId: session.user.id,
      action: "audit_rejected", // Reusing this action type to indicate a return
      metadata: { comments: "Returned to process owner by reporting manager", extensionPercentage },
    });

    return NextResponse.json({ task: updated }, { status: 200 });
  } catch (error: any) {
    console.error("POST task return error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
