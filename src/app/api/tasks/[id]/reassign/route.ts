import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { taskInstances, taskAuditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const { id: taskId } = await props.params;
    
    // Auth Check
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Usually we would map the email to a user ID, but for now we'll just record what we have
    // or look up the user:
    const { authUsers } = await import("@/db/schema");
    const [actorUser] = await db.select().from(authUsers).where(eq(authUsers.email, session.user.email)).limit(1);
    const actorUserId = actorUser?.id || null;

    const body = await req.json();
    const { newRoleId, newUserId, reason } = body;

    if (!newRoleId && !newUserId) {
      return NextResponse.json({ error: "Must specify a new Role or User to reassign to." }, { status: 400 });
    }

    // Get the task
    const [task] = await db.select().from(taskInstances).where(eq(taskInstances.id, taskId)).limit(1);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const previousRoleId = task.assignedRoleId;
    const previousUserId = task.assignedUserId;

    // We can also clear the "audit_pending" status and push it back to "pending" so the new assignee can act on it
    let newStatus = task.status;
    let newCtx = task.contextData as any || {};

    if (task.status === "audit_pending") {
      newStatus = "pending";
      newCtx.escalated = false;
      newCtx.escalationReason = undefined;
      newCtx.auditLevel = undefined;
    }

    await db.transaction(async (tx) => {
      // 1. Update task
      await tx.update(taskInstances)
        .set({
          assignedRoleId: newRoleId || null,
          assignedUserId: newUserId || null,
          status: newStatus,
          contextData: newCtx,
          updatedAt: new Date()
        })
        .where(eq(taskInstances.id, taskId));

      // 2. Log audit
      await tx.insert(taskAuditLogs).values({
        organizationId: task.organizationId,
        taskInstanceId: task.id,
        actorUserId: actorUserId,
        action: "reassigned",
        metadata: {
          previousRoleId,
          previousUserId,
          newRoleId: newRoleId || null,
          newUserId: newUserId || null,
          reason: reason || "Manual Reassignment by Admin"
        }
      });
    });

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error: any) {
    console.error("POST task reassign error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
