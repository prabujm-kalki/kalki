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

    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("organizationId") || await getOrganizationForUser(user.id);
    const locationId = searchParams.get("locationId");
    if (!orgId) return NextResponse.json({ error: "No organization found" }, { status: 400 });
    
    const definitions = await db.select()
      .from(taskDefinitions)
      .where(eq(taskDefinitions.organizationId, orgId));

    const defIds = definitions.map(d => d.id);
    let matrices: any[] = [];
    let instances: any[] = [];
    if (defIds.length > 0) {
      matrices = await db.select()
        .from(taskEscalationMatrices)
        .where(inArray(taskEscalationMatrices.definitionId, defIds));

      // Fetch the latest active/completed instances for runtime pipeline flow tracking
      const { taskInstances, authUsers } = await import("@/db/schema");
      instances = await db.select({
        id: taskInstances.id,
        definitionId: taskInstances.definitionId,
        status: taskInstances.status,
        escalationLevel: taskInstances.escalationLevel,
        dueAt: taskInstances.dueAt,
        completedAt: taskInstances.completedAt,
        createdAt: taskInstances.createdAt,
        scoreSnapshot: taskInstances.scoreSnapshot,
        completionProofUrl: taskInstances.completionProofUrl,
        contextData: taskInstances.contextData,
        userName: authUsers.name,
      })
      .from(taskInstances)
      .leftJoin(authUsers, eq(taskInstances.assignedUserId, authUsers.id))
      .where(inArray(taskInstances.definitionId, defIds));
    }

    const result = definitions.map(def => {
      let defInstances = instances.filter(i => i.definitionId === def.id);
      
      // Filter by location if specified
      if (locationId) {
        defInstances = defInstances.filter(i => {
          const ctxLocId = (i.contextData as any)?.locationId;
          return !ctxLocId || ctxLocId === locationId;
        });
      }

      // Sort by creation desc
      defInstances.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      // Find the last completed cycle
      const lastCompletedCycle = defInstances.find(i => i.status === "completed") || null;
      // Find current active instance if any
      const activeInstance = defInstances.find(i => i.status === "pending" || i.status === "in_progress") || null;

      return {
        ...def,
        escalationLevels: matrices
          .filter(m => m.definitionId === def.id)
          .sort((a, b) => a.level - b.level),
        liveInstance: activeInstance ? {
          id: activeInstance.id,
          status: activeInstance.status,
          escalationLevel: activeInstance.escalationLevel,
          dueAt: activeInstance.dueAt,
          completedAt: activeInstance.completedAt,
          createdAt: activeInstance.createdAt,
          scoreSnapshot: activeInstance.scoreSnapshot,
          completionProofUrl: activeInstance.completionProofUrl,
          actorName: activeInstance.userName || "Staff",
        } : null,
        lastCycle: lastCompletedCycle ? {
          id: lastCompletedCycle.id,
          status: lastCompletedCycle.status,
          escalationLevel: lastCompletedCycle.escalationLevel,
          dueAt: lastCompletedCycle.dueAt,
          completedAt: lastCompletedCycle.completedAt,
          createdAt: lastCompletedCycle.createdAt,
          scoreSnapshot: lastCompletedCycle.scoreSnapshot,
          completionProofUrl: lastCompletedCycle.completionProofUrl,
          actorName: lastCompletedCycle.userName || "Staff",
        } : null,
      };
    });

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

    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const orgId = body.organizationId || searchParams.get("organizationId") || await getOrganizationForUser(user.id);
    if (!orgId) return NextResponse.json({ error: "No organization found" }, { status: 400 });

    const [newDef] = await db.insert(taskDefinitions).values({
      organizationId: orgId,
      module: body.module || "system",
      title: body.title,
      description: body.description || null,
      triggerType: body.triggerType || "time",
      triggerConfig: body.triggerConfig || {},
      targetRoleId: body.targetRoleId || null,
      targetUserId: body.targetUserId || null,
      escalationPolicyId: body.escalationPolicyId || null,
      actionType: body.actionType || "task",
      contextTemplate: body.contextTemplate || {},
      completionTimeMins: body.completionTimeMins || null,
      warningThresholdMins: body.warningThresholdMins || null,
      allowTimeExtension: !!body.allowTimeExtension,
      maxExtensionMins: body.maxExtensionMins || null,
      requiresApproval: !!body.requiresApproval,
      evidenceRequirementType: body.evidenceRequirementType || "optional",
      priority: body.priority || "medium",
      checklistConfig: body.checklistConfig || [],
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
