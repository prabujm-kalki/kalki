import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { taskInstances, taskAuditLogs, taskDefinitions, authUsers, businessRoles } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const { id: taskId } = await props.params;

    // Fetch the main task
    const [task] = await db
      .select({
        id: taskInstances.id,
        status: taskInstances.status,
        priority: taskInstances.priority,
        escalationLevel: taskInstances.escalationLevel,
        createdAt: taskInstances.createdAt,
        updatedAt: taskInstances.updatedAt,
        dueAt: taskInstances.dueAt,
        completedAt: taskInstances.completedAt,
        contextData: taskInstances.contextData,
        definitionName: taskDefinitions.title,
        definitionTimeMins: taskDefinitions.completionTimeMins,
        assignedUserEmail: authUsers.email,
        assignedRoleName: businessRoles.name
      })
      .from(taskInstances)
      .leftJoin(taskDefinitions, eq(taskInstances.definitionId, taskDefinitions.id))
      .leftJoin(authUsers, eq(taskInstances.assignedUserId, authUsers.id))
      .leftJoin(businessRoles, eq(taskInstances.assignedRoleId, businessRoles.id))
      .where(eq(taskInstances.id, taskId))
      .limit(1);

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Fetch the chronological audit trail
    const rawLogs = await db
      .select({
        id: taskAuditLogs.id,
        action: taskAuditLogs.action,
        metadata: taskAuditLogs.metadata,
        createdAt: taskAuditLogs.createdAt,
        actorUserId: taskAuditLogs.actorUserId,
        actorEmail: authUsers.email,
        actorName: authUsers.name,
      })
      .from(taskAuditLogs)
      .leftJoin(authUsers, eq(taskAuditLogs.actorUserId, authUsers.id))
      .where(eq(taskAuditLogs.taskInstanceId, taskId))
      .orderBy(desc(taskAuditLogs.createdAt));

    // Fetch all business roles to map UUIDs in metadata to Role Names
    const roles = await db.select({ id: businessRoles.id, name: businessRoles.name }).from(businessRoles);
    const roleMap = Object.fromEntries(roles.map(r => [r.id, r.name]));

    const logs = rawLogs.map(log => {
      let md = log.metadata as any;
      if (md && typeof md === 'object') {
        // Map role IDs to role names
        if (md.newRoleId && roleMap[md.newRoleId]) md.newRoleId = roleMap[md.newRoleId];
        if (md.escalatedToRoleId && roleMap[md.escalatedToRoleId]) md.escalatedToRoleId = roleMap[md.escalatedToRoleId];
        if (md.previousRoleId && roleMap[md.previousRoleId]) md.previousRoleId = roleMap[md.previousRoleId];
        if (md.assignedRoleId && roleMap[md.assignedRoleId]) md.assignedRoleId = roleMap[md.assignedRoleId];
      }
      return { ...log, metadata: md };
    });

    // Combine and send
    return NextResponse.json({ task, logs, availableRoles: roles }, { status: 200 });

  } catch (error: any) {
    console.error("GET task timeline error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
