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
    const { action, comments, extensionPercentage = 100 } = body; // action = "approve" or "reject"

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

    if (task.status !== "audit_pending") {
      return NextResponse.json({ error: "Task is not pending audit" }, { status: 400 });
    }

    // Phase 4: Handle Audit Action
    let nextStatus: "completed" | "in_progress" = "completed";
    let updatePayload: any = {
      status: "completed",
      updatedAt: new Date(),
    };

    if (action === "reject") {
      nextStatus = "in_progress"; // Send back to the user
      
      const originalMins = taskRecord.completionTimeMins || 60; // Default to 60 if null
      const grantedMins = Math.round(originalMins * (extensionPercentage / 100));
      const newDueAt = new Date(Date.now() + (grantedMins * 60 * 1000));

      updatePayload = {
        status: nextStatus,
        updatedAt: new Date(),
        dueAt: newDueAt,
        assignedRoleId: originalRoleId || task.assignedRoleId, // Restore original role
        assignedUserId: originalUserId || task.assignedUserId, // Restore original user
        escalationLevel: 0 // Reset escalation so they get standard time again
      };
    }

    // Update Task
    const [updated] = await db.update(taskInstances).set(updatePayload).where(eq(taskInstances.id, taskId)).returning();

    // Log the audit action (escalation history/audit log)
    // Assuming taskAuditLogs exists in the system to track these touches
    // If not, we just update the status. But we defined taskAuditLogs in Phase 1 / existing schema.
    // However, I removed the duplicate taskAuditLogs in schema.ts during cleanup. The old one at line 1133 exists.
    await db.insert(taskAuditLogs).values({
      organizationId: task.organizationId,
      taskInstanceId: task.id,
      actorUserId: session.user.id,
      action: action === "approve" ? "audit_approved" : "audit_rejected",
      metadata: { comments },
    });

    return NextResponse.json({ task: updated }, { status: 200 });
  } catch (error: any) {
    console.error("POST task audit error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
