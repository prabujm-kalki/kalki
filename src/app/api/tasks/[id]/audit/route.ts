import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { taskInstances, taskAuditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: taskId } = await props.params;
    const body = await req.json();
    const { action, comments } = body; // action = "approve" or "reject"

    const [task] = await db.select().from(taskInstances).where(eq(taskInstances.id, taskId)).limit(1);
    
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (task.status !== "audit_pending") {
      return NextResponse.json({ error: "Task is not pending audit" }, { status: 400 });
    }

    // Phase 4: Handle Audit Action
    let nextStatus: "completed" | "in_progress" = "completed";
    if (action === "reject") {
      nextStatus = "in_progress"; // Send back to the user
    }

    // Update Task
    const [updated] = await db.update(taskInstances).set({
      status: nextStatus,
      updatedAt: new Date(),
    }).where(eq(taskInstances.id, taskId)).returning();

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
