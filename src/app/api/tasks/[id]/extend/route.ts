import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { taskInstances, taskDefinitions, taskAuditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: taskId } = await props.params;
    const body = await req.json();
    const { extensionMins } = body;

    if (!extensionMins || extensionMins <= 0) {
      return NextResponse.json({ error: "Invalid extension time" }, { status: 400 });
    }

    const [taskRecord] = await db
      .select({
        instance: taskInstances,
        allowTimeExtension: taskDefinitions.allowTimeExtension,
        maxExtensionMins: taskDefinitions.maxExtensionMins
      })
      .from(taskInstances)
      .leftJoin(taskDefinitions, eq(taskInstances.definitionId, taskDefinitions.id))
      .where(eq(taskInstances.id, taskId))
      .limit(1);
    
    if (!taskRecord || !taskRecord.instance) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const task = taskRecord.instance;
    const ctx = task.contextData as any || {};

    const allowExtension = ctx.allowTimeExtension ?? taskRecord.allowTimeExtension ?? true;
    const maxMins = ctx.maxExtensionMins ?? taskRecord.maxExtensionMins ?? 15;

    if (task.status !== "pending" && task.status !== "in_progress") {
      return NextResponse.json({ error: "Task cannot be extended in its current status" }, { status: 400 });
    }

    if (!allowExtension) {
      return NextResponse.json({ error: "Time extension is not allowed for this task" }, { status: 403 });
    }

    if (task.extensionRequestedMins + extensionMins > maxMins) {
      return NextResponse.json({ error: `Cannot exceed maximum allowed extension of ${maxMins} minutes.` }, { status: 400 });
    }

    if (!task.dueAt) {
      return NextResponse.json({ error: "Task does not have a due date to extend" }, { status: 400 });
    }

    // Extend the due date
    const newDueAt = new Date(task.dueAt.getTime() + (extensionMins * 60 * 1000));
    
    // Reset the warning flags so they might get warned again if applicable
    ctx.warningSent = false;
    ctx.isWarning = false;

    const [updated] = await db.update(taskInstances)
      .set({
        dueAt: newDueAt,
        extensionRequestedMins: task.extensionRequestedMins + extensionMins,
        contextData: ctx,
        updatedAt: new Date(),
      })
      .where(eq(taskInstances.id, taskId))
      .returning();

    await db.insert(taskAuditLogs).values({
      organizationId: task.organizationId,
      taskInstanceId: task.id,
      actorUserId: session.user.id,
      action: "time_extended",
      metadata: { extensionMins, newDueAt },
    });

    return NextResponse.json({ task: updated }, { status: 200 });
  } catch (error: any) {
    console.error("POST task extend error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
