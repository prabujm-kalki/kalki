import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { taskInstances, taskDefinitions } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: taskId } = await props.params;
    const body = await req.json();
    const { completionProofUrl, completionData, checklistResponses } = body;

    // Fetch the task instance
    const [task] = await db.select().from(taskInstances).where(eq(taskInstances.id, taskId)).limit(1);
    
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (task.status !== "pending" && task.status !== "in_progress") {
      return NextResponse.json({ error: "Task is not pending completion" }, { status: 400 });
    }

    // Fetch task definition if present
    let taskDef: any = null;
    if (task.definitionId) {
      const [def] = await db.select().from(taskDefinitions).where(eq(taskDefinitions.id, task.definitionId)).limit(1);
      taskDef = def;
    }

    let evidenceRequirementType = (task.contextData as any)?.adHocEvidenceRequirement;
    if (!evidenceRequirementType || evidenceRequirementType === "none") {
      if (taskDef) evidenceRequirementType = taskDef.evidenceRequirementType;
    }
    evidenceRequirementType = evidenceRequirementType || "none";

    // Validate Evidence
    if (
      evidenceRequirementType === "mandatory" ||
      evidenceRequirementType === "image" ||
      evidenceRequirementType === "document"
    ) {
      if (!completionProofUrl) {
        return NextResponse.json({ error: "Attachment / proof of completion is mandatory for this task." }, { status: 400 });
      }
    } else if (evidenceRequirementType === "system_record") {
      if (!completionData) {
        return NextResponse.json({ error: "System record proof is required." }, { status: 400 });
      }
    }

    // Calculate Checklist Score & SLA performance metrics (KPI/Scorecard wiring)
    let scoreSnapshot: any = null;
    if (checklistResponses && Array.isArray(checklistResponses)) {
      const totalItems = checklistResponses.length;
      const completedItems = checklistResponses.filter((i: any) => i.checked || (i.value && i.value.toString().trim() !== "")).length;
      const scorePercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 100;
      
      const isOverdue = task.dueAt ? new Date() > new Date(task.dueAt) : false;
      const slaStatus = task.escalationLevel > 0 
        ? "ESCALATED" 
        : isOverdue 
        ? "BREACHED" 
        : task.extensionRequestedMins > 0 
        ? "EXTENDED" 
        : "ON_TIME";

      scoreSnapshot = {
        totalItems,
        completedItems,
        scorePercent,
        slaStatus,
        escalationLevel: task.escalationLevel,
        extensionRequestedMins: task.extensionRequestedMins,
        evaluatedAt: new Date().toISOString(),
      };
    }

    // Determine next status:
    // If task definition explicitly defines requiresApproval:
    //   - true => audit_pending (routes to supervisor)
    //   - false => completed
    // Otherwise fallback to priority-based audit logic
    let nextStatus: "completed" | "audit_pending" = "completed";
    let nextAssignedRoleId = task.assignedRoleId;

    const requiresApproval = taskDef ? !!taskDef.requiresApproval : (task.priority === "medium" || task.priority === "high" || task.priority === "very_high");

    if (requiresApproval) {
      nextStatus = "audit_pending";
      
      if (task.assignedRoleId) {
        const { businessRoles } = await import("@/db/schema");
        const [roleInfo] = await db.select({ reportsToRoleId: businessRoles.reportsToRoleId })
          .from(businessRoles)
          .where(eq(businessRoles.id, task.assignedRoleId))
          .limit(1);
          
        if (roleInfo?.reportsToRoleId) {
          nextAssignedRoleId = roleInfo.reportsToRoleId;
        } else {
          // If no reporting manager, escalate to system owner (null)
          nextAssignedRoleId = null;
        }
      }
    }

    const [updated] = await db.update(taskInstances).set({
      status: nextStatus,
      assignedRoleId: nextAssignedRoleId,
      assignedUserId: null, // Clear user assignment so it goes to the manager's role queue
      completionProofUrl,
      completionData,
      checklistResponses: checklistResponses || null,
      scoreSnapshot: scoreSnapshot || null,
      completedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(taskInstances.id, taskId)).returning();

    return NextResponse.json({ task: updated }, { status: 200 });
  } catch (error: any) {
    console.error("POST task complete error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
