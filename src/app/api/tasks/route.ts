import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { taskInstances, taskCheckpoints, taskDefinitions } from "@/db/schema";
import { eq, and, desc, or, inArray } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId");
    const locationId = searchParams.get("locationId");

    if (!organizationId) {
      return NextResponse.json({ error: "Organization required" }, { status: 400 });
    }

    const conditions = [
      eq(taskInstances.organizationId, organizationId),
    ];

    const { authUsers, businessRoles, employees, employeeRoleAssignments } = await import("@/db/schema");

    // Fetch user's business roles via employee mapping
    const employeeRows = await db
      .select({ id: employees.id })
      .from(employees)
      .where(and(
        eq(employees.userId, session.user.id),
        eq(employees.organizationId, organizationId)
      ));

    let userRoleIds: string[] = [];
    
    if (employeeRows.length > 0) {
      const employeeIds = employeeRows.map(e => e.id);
      
      const roleAssignmentRows = await db
        .select({ roleId: employeeRoleAssignments.roleId })
        .from(employeeRoleAssignments)
        .where(and(
          inArray(employeeRoleAssignments.employeeId, employeeIds),
          eq(employeeRoleAssignments.isActive, true)
        ));
        
      userRoleIds = [...new Set(roleAssignmentRows.map(r => r.roleId))];
    }

    if (userRoleIds.length > 0) {
      conditions.push(
        or(
          eq(taskInstances.assignedUserId, session.user.id),
          inArray(taskInstances.assignedRoleId, userRoleIds)
        )!
      );
    } else {
      conditions.push(eq(taskInstances.assignedUserId, session.user.id));
    }
    const results = await db
      .select({
        instance: taskInstances,
        definition: taskDefinitions,
        userName: authUsers.name,
        roleName: businessRoles.name
      })
      .from(taskInstances)
      .innerJoin(taskDefinitions, eq(taskInstances.definitionId, taskDefinitions.id))
      .leftJoin(authUsers, eq(taskInstances.assignedUserId, authUsers.id))
      .leftJoin(businessRoles, eq(taskInstances.assignedRoleId, businessRoles.id))
      .where(and(...conditions))
      .orderBy(desc(taskInstances.createdAt));

    const activeTasks = results
      .map(({ instance, definition, userName, roleName }) => {
        const ctx: any = instance.contextData || {};
        return {
          ...instance,
          locationId: ctx.locationId || null,
          title: ctx.title || definition.title,
          description: ctx.description || definition.description,
          evidenceRequirementType: ctx.adHocEvidenceRequirement || definition.evidenceRequirementType,
          warningThresholdMins: ctx.warningThresholdMins ?? definition.warningThresholdMins ?? 10,
          allowTimeExtension: ctx.allowTimeExtension ?? definition.allowTimeExtension ?? true,
          maxExtensionMins: ctx.maxExtensionMins ?? definition.maxExtensionMins ?? 15,
          deadline: instance.dueAt, // Maps dueAt to deadline for frontend
          actionUrl: ctx.actionUrl || (definition.contextTemplate as any)?.actionUrl,
          actionLabel: ctx.actionLabel || (definition.contextTemplate as any)?.actionLabel,
          processOwnerName: userName || roleName || "Unassigned",
          triggerConfig: definition.triggerConfig,
        };
      })
      .filter(t => !locationId || t.locationId === locationId); // Filter in memory for ad-hoc locationId

    return NextResponse.json({ tasks: activeTasks });
  } catch (error: any) {
    console.error("GET tasks error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, description, priority, deadline, organizationId, locationId, assignedUserId, evidenceRequirementType } = body;

    if (!title || !deadline || !organizationId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const now = new Date();
    const deadlineDate = new Date(deadline);
    const durationMs = deadlineDate.getTime() - now.getTime();

    if (durationMs <= 0) {
      return NextResponse.json({ error: "Deadline must be in the future" }, { status: 400 });
    }

    // Since taskInstances requires a definitionId, we create/fetch a generic Ad-Hoc definition
    let adHocDef = await db.select().from(taskDefinitions)
      .where(and(eq(taskDefinitions.organizationId, organizationId), eq(taskDefinitions.triggerType, "ad_hoc")))
      .limit(1)
      .then(res => res[0]);

    if (!adHocDef) {
      const [newDef] = await db.insert(taskDefinitions).values({
        organizationId,
        module: "system",
        title: "Ad-Hoc Tasks",
        description: "Container for ad-hoc generated tasks",
        triggerType: "ad_hoc",
      }).returning();
      adHocDef = newDef;
    }

    // Insert Task Instance
    const [newTask] = await db.insert(taskInstances).values({
      organizationId,
      definitionId: adHocDef.id,
      priority: priority || "medium",
      status: "pending",
      dueAt: deadlineDate,
      assignedUserId: assignedUserId || session.user.id,
      contextData: {
        title,
        description,
        locationId: locationId || null,
        adHocEvidenceRequirement: evidenceRequirementType || "none"
      },
    }).returning();

    // Calculate Checkpoints
    const durationHours = durationMs / (1000 * 60 * 60);
    const checkpointsToCreate = [];

    if (durationHours > 8) {
      checkpointsToCreate.push({
        taskInstanceId: newTask.id,
        percentage: 50,
        triggerTime: new Date(now.getTime() + (durationMs * 0.5)),
        status: "PENDING",
      });
    }

    checkpointsToCreate.push({
      taskInstanceId: newTask.id,
      percentage: 75,
      triggerTime: new Date(now.getTime() + (durationMs * 0.75)),
      status: "PENDING",
    });

    await db.insert(taskCheckpoints).values(checkpointsToCreate);

    return NextResponse.json({ success: true, task: newTask });
  } catch (error: any) {
    console.error("POST tasks error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
