import { NextResponse } from "next/server";
import { db } from "@/db";
import { taskDefinitions, taskEscalationMatrices, taskInstances } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuthenticatedUser } from "@/lib/authorization";
import { organizationMemberships } from "@/db/schema";

async function getOrganizationForUser(userId: string) {
  const [membership] = await db.select()
    .from(organizationMemberships)
    .where(eq(organizationMemberships.userId, userId))
    .limit(1);
  return membership?.organizationId;
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const taskId = resolvedParams.id;

    const user = await requireAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orgId = await getOrganizationForUser(user.id);
    if (!orgId) return NextResponse.json({ error: "No organization found" }, { status: 400 });

    // Verify ownership
    const [task] = await db.select()
      .from(taskDefinitions)
      .where(eq(taskDefinitions.id, taskId));

    if (!task) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (task.organizationId !== orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete dependent matrices first
    await db.delete(taskEscalationMatrices)
      .where(eq(taskEscalationMatrices.definitionId, taskId));
    
    // Delete dependent instances
    await db.delete(taskInstances)
      .where(eq(taskInstances.definitionId, taskId));

    // Delete the task definition
    await db.delete(taskDefinitions)
      .where(eq(taskDefinitions.id, taskId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete task definition:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const taskId = resolvedParams.id;

    const user = await requireAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orgId = await getOrganizationForUser(user.id);
    if (!orgId) return NextResponse.json({ error: "No organization found" }, { status: 400 });

    const [task] = await db.select()
      .from(taskDefinitions)
      .where(eq(taskDefinitions.id, taskId));

    if (!task) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (task.organizationId !== orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    // Update definition
    const [updatedDef] = await db.update(taskDefinitions).set({
      title: body.title,
      triggerType: body.triggerType,
      triggerConfig: body.triggerConfig || {},
      targetRoleId: body.targetRoleId || null,
      targetUserId: body.targetUserId || null,
      actionType: body.actionType || "task",
      contextTemplate: body.contextTemplate || {},
      completionTimeMins: body.completionTimeMins || null,
      warningThresholdMins: body.warningThresholdMins || null,
      allowTimeExtension: !!body.allowTimeExtension,
      maxExtensionMins: body.maxExtensionMins || null,
      updatedAt: new Date(),
    }).where(eq(taskDefinitions.id, taskId)).returning();

    // Update escalation matrices
    // For simplicity, delete old and insert new
    await db.delete(taskEscalationMatrices).where(eq(taskEscalationMatrices.definitionId, taskId));
    
    if (body.escalationLevels && Array.isArray(body.escalationLevels)) {
      const matrices = body.escalationLevels.map((level: any, index: number) => ({
        definitionId: taskId,
        level: index + 1,
        roleId: level.roleId && level.roleId !== "REPORTING_MANAGER" ? level.roleId : null,
        escalateToReportingManager: level.roleId === "REPORTING_MANAGER" || level.escalateToReportingManager || false,
        timeoutMinutes: level.timeoutMinutes,
      }));
      if (matrices.length > 0) {
        await db.insert(taskEscalationMatrices).values(matrices);
      }
    }

    return NextResponse.json(updatedDef);
  } catch (error) {
    console.error("Failed to update task definition:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
