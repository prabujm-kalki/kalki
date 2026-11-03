import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { taskInstances, taskDefinitions, authUsers, businessRoles } from "@/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId");
    const locationId = searchParams.get("locationId");
    const status = searchParams.get("status"); // optional filter (e.g. "completed")
    const priority = searchParams.get("priority"); // optional filter (e.g. "high")
    const moduleFilter = searchParams.get("module"); // optional filter (e.g. "purchase", "catering", etc.)

    if (!organizationId) {
      return NextResponse.json({ error: "Organization required" }, { status: 400 });
    }

    const conditions = [
      eq(taskInstances.organizationId, organizationId),
    ];

    if (moduleFilter && moduleFilter !== "all") {
      conditions.push(eq(taskDefinitions.module, moduleFilter as any));
    }

    if (priority && priority !== "all") {
      conditions.push(eq(taskInstances.priority, priority as any));
    }

    if (status && status !== "all") {
      conditions.push(eq(taskInstances.status, status as any));
    } else {
      // Default to finished tasks: completed or audit_pending
      conditions.push(inArray(taskInstances.status, ["completed", "audit_pending"]));
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
      .orderBy(desc(taskInstances.updatedAt))
      .limit(100);

    const historyTasks = results
      .map(({ instance, definition, userName, roleName }) => {
        const ctx: any = instance.contextData || {};
        return {
          ...instance,
          locationId: ctx.locationId || null,
          title: ctx.title || definition.title,
          description: ctx.description || definition.description,
          module: definition.module || "system",
          categoryBadge: ctx.categoryBadge || (definition.module === "purchase" ? "PURCHASING" : definition.module === "catering" ? "CATERING" : definition.module === "inventory" ? "INVENTORY" : "ROUTINE"),
          assignedRoleName: roleName || "General Staff",
          completedByName: userName || "Staff",
          checklistConfig: definition.checklistConfig,
          triggerConfig: definition.triggerConfig,
          escalationPolicyId: definition.escalationPolicyId,
          requiresApproval: definition.requiresApproval,
          evidenceRequirementType: definition.evidenceRequirementType,
        };
      })
      .filter(t => !locationId || !t.locationId || t.locationId === locationId);

    return NextResponse.json({ tasks: historyTasks });
  } catch (error: any) {
    console.error("GET tasks history error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
