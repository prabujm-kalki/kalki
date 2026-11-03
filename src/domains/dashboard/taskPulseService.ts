import { db } from "@/db";
import { 
  taskInstances, 
  taskDefinitions, 
  businessRoles,
} from "@/db/schema";
import { eq, and, sql, inArray, gte, lte } from "drizzle-orm";
import { DashboardScopeContext, TasksPulseData, OverdueTaskItem, TaskPriorityBreakdown } from "./types";
import { resolveDateRange } from "./dateRangeResolver";

export async function getTasksPulse(context: DashboardScopeContext): Promise<TasksPulseData> {
  const { organizationId, locationId, dateRangePreset, fromDate, toDate } = context;

  const defaultBucket = (): TaskPriorityBreakdown => ({
    total: 0,
    completed: 0,
    inProgress: 0,
    pending: 0,
    overdue: 0,
  });

  const defaultResult: TasksPulseData = {
    highPriority: defaultBucket(),
    mediumPriority: defaultBucket(),
    lowPriority: defaultBucket(),
    routineCompletionRate: 0,
    routinesTotal: 0,
    routinesDone: 0,
    topOverdueList: [],
  };

  if (!organizationId) return defaultResult;

  try {
    const range = resolveDateRange(dateRangePreset, fromDate, toDate);
    const now = new Date();
    
    // Conditions
    const conditions = [
      eq(taskInstances.organizationId, organizationId),
      gte(taskInstances.createdAt, range.fromDateTime),
      lte(taskInstances.createdAt, range.toDateTime),
    ];

    if (locationId && locationId !== "ALL") {
      conditions.push(
        sql`(${taskInstances.contextData}->>'locationId' = ${locationId} OR ${taskInstances.contextData}->>'branchId' = ${locationId} OR ${taskDefinitions.contextTemplate}->>'locationId' = ${locationId})`
      );
    }

    // 1. Fetch task instances within the selected date range
    const tasks = await db
      .select({
        id: taskInstances.id,
        priority: taskInstances.priority,
        status: taskInstances.status,
        dueAt: taskInstances.dueAt,
        triggerType: taskDefinitions.triggerType,
        actionType: taskDefinitions.actionType,
        title: taskDefinitions.title,
        contextData: taskInstances.contextData,
        assignedUserId: taskInstances.assignedUserId,
        assignedRoleId: taskInstances.assignedRoleId,
      })
      .from(taskInstances)
      .innerJoin(taskDefinitions, eq(taskInstances.definitionId, taskDefinitions.id))
      .where(and(...conditions))
      .limit(1000);

    const high = defaultBucket();
    const medium = defaultBucket();
    const low = defaultBucket();

    let routinesTotal = 0;
    let routinesDone = 0;
    const overdueHighCandidateIds: string[] = [];

    for (const t of tasks) {
      const prioStr = (t.priority || "medium").toLowerCase();
      let bucket: TaskPriorityBreakdown;
      if (prioStr === "high" || prioStr === "urgent") {
        bucket = high;
      } else if (prioStr === "low") {
        bucket = low;
      } else {
        bucket = medium;
      }

      bucket.total++;

      const isCompleted = ["completed", "verified", "done"].includes(t.status.toLowerCase());
      const isInProgress = ["in_progress", "audit_pending"].includes(t.status.toLowerCase());
      const isPending = t.status.toLowerCase() === "pending";
      const isOverdue = !isCompleted && t.dueAt && new Date(t.dueAt) < now;

      if (isCompleted) bucket.completed++;
      else if (isInProgress) bucket.inProgress++;
      else if (isPending) bucket.pending++;

      if (isOverdue) {
        bucket.overdue++;
        if (bucket === high) {
          overdueHighCandidateIds.push(t.id);
        }
      }

      // Check if routine/checklist
      const isRoutine = t.triggerType === "time" || (t.actionType && t.actionType.includes("routine"));
      if (isRoutine) {
        routinesTotal++;
        if (isCompleted) routinesDone++;
      }
    }

    // 2. Fetch top 5 overdue high-priority items with details
    let topOverdueList: OverdueTaskItem[] = [];
    if (overdueHighCandidateIds.length > 0) {
      const detailed = await db
        .select({
          id: taskInstances.id,
          priority: taskInstances.priority,
          dueAt: taskInstances.dueAt,
          title: taskDefinitions.title,
          contextData: taskInstances.contextData,
          roleName: businessRoles.name,
        })
        .from(taskInstances)
        .innerJoin(taskDefinitions, eq(taskInstances.definitionId, taskDefinitions.id))
        .leftJoin(businessRoles, eq(taskInstances.assignedRoleId, businessRoles.id))
        .where(inArray(taskInstances.id, overdueHighCandidateIds.slice(0, 5)))
        .orderBy(taskInstances.dueAt);

      topOverdueList = detailed.map((d) => {
        const dueTime = d.dueAt ? new Date(d.dueAt).getTime() : now.getTime();
        const diffMins = Math.max(0, Math.floor((now.getTime() - dueTime) / 60000));
        const ctx: any = d.contextData || {};
        return {
          id: d.id,
          title: d.title,
          priority: d.priority,
          dueAt: d.dueAt ? d.dueAt.toISOString() : null,
          overdueMinutes: diffMins,
          assignedRoleName: d.roleName || null,
          locationName: ctx.locationName || ctx.branchName || null,
          locationId: ctx.locationId || ctx.branchId || null,
        };
      });
    }

    const routineRate = routinesTotal > 0 ? Math.round((routinesDone / routinesTotal) * 100) : 100;

    return {
      highPriority: high,
      mediumPriority: medium,
      lowPriority: low,
      routineCompletionRate: routineRate,
      routinesTotal,
      routinesDone,
      topOverdueList,
    };
  } catch (err) {
    console.error("Error fetching getTasksPulse:", err);
    return defaultResult;
  }
}
