import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { taskInstances, taskDefinitions } from "@/db/schema";
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
      eq(taskInstances.status, "audit_pending")
    ];

    const { employees, employeeRoleAssignments } = await import("@/db/schema");

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
        )
      );
    } else {
      conditions.push(eq(taskInstances.assignedUserId, session.user.id));
    }

    const results = await db
      .select({
        instance: taskInstances,
        definition: taskDefinitions
      })
      .from(taskInstances)
      .innerJoin(taskDefinitions, eq(taskInstances.definitionId, taskDefinitions.id))
      .where(and(...conditions))
      .orderBy(desc(taskInstances.updatedAt));

    const auditTasks = results
      .map(({ instance, definition }) => {
        const ctx: any = instance.contextData || {};
        return {
          ...instance,
          locationId: ctx.locationId || null,
          title: ctx.title || definition.title,
          description: ctx.description || definition.description,
          evidenceRequirementType: ctx.adHocEvidenceRequirement || definition.evidenceRequirementType,
          deadline: instance.dueAt,
        };
      })
      .filter(t => !locationId || t.locationId === locationId);

    return NextResponse.json({ tasks: auditTasks });
  } catch (error: any) {
    console.error("GET audit tasks error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
