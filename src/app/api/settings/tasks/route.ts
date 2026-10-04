import { NextResponse } from "next/server";
import { db } from "@/db";
import { taskDefinitions, taskEscalationMatrices } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { requireAuthenticatedUser } from "@/lib/authorization";
// We need to find how Kalki gets org context, let's assume getOrganizationForUser exists or we just fetch from memberships.
import { organizationMemberships } from "@/db/schema";

async function getOrganizationForUser(userId: string) {
  const [membership] = await db.select()
    .from(organizationMemberships)
    .where(eq(organizationMemberships.userId, userId))
    .limit(1);
  return membership?.organizationId;
}

export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orgId = await getOrganizationForUser(user.id);
    if (!orgId) return NextResponse.json({ error: "No organization found" }, { status: 400 });
    
    const definitions = await db.select()
      .from(taskDefinitions)
      .where(eq(taskDefinitions.organizationId, orgId));

    const defIds = definitions.map(d => d.id);
    let matrices: any[] = [];
    if (defIds.length > 0) {
      matrices = await db.select()
        .from(taskEscalationMatrices)
        .where(inArray(taskEscalationMatrices.definitionId, defIds));
    }

    const result = definitions.map(def => ({
      ...def,
      escalationLevels: matrices
        .filter(m => m.definitionId === def.id)
        .sort((a, b) => a.level - b.level)
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch task definitions:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orgId = await getOrganizationForUser(user.id);
    if (!orgId) return NextResponse.json({ error: "No organization found" }, { status: 400 });

    const body = await request.json();

    const [newDef] = await db.insert(taskDefinitions).values({
      organizationId: orgId,
      module: "system",
      title: body.title,
      description: body.description,
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
    }).returning();

    if (body.escalationLevels && Array.isArray(body.escalationLevels)) {
      const matrices = body.escalationLevels.map((level: any, index: number) => ({
        definitionId: newDef.id,
        level: index + 1,
        roleId: level.roleId && level.roleId !== "REPORTING_MANAGER" ? level.roleId : null,
        escalateToReportingManager: level.roleId === "REPORTING_MANAGER" || level.escalateToReportingManager || false,
        timeoutMinutes: level.timeoutMinutes,
      }));
      if (matrices.length > 0) {
        await db.insert(taskEscalationMatrices).values(matrices);
      }
    }

    return NextResponse.json(newDef);
  } catch (error) {
    console.error("Failed to create task definition:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
