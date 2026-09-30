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
    const { completionProofUrl, completionData } = body;

    // Fetch the task instance
    const [task] = await db.select().from(taskInstances).where(eq(taskInstances.id, taskId)).limit(1);
    
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (task.status !== "pending" && task.status !== "in_progress") {
      return NextResponse.json({ error: "Task is not pending completion" }, { status: 400 });
    }

    let evidenceRequirementType = (task.contextData as any)?.adHocEvidenceRequirement;
    if (!evidenceRequirementType || evidenceRequirementType === "none") {
      if (task.definitionId) {
        // If it comes from a definition, fetch it.
        const [def] = await db.select().from(taskDefinitions).where(eq(taskDefinitions.id, task.definitionId)).limit(1);
        if (def) evidenceRequirementType = def.evidenceRequirementType;
      }
    }
    evidenceRequirementType = evidenceRequirementType || "none";

    // Validate Evidence
    if (evidenceRequirementType === "image" || evidenceRequirementType === "document") {
      if (!completionProofUrl) {
        return NextResponse.json({ error: `Completion proof (${evidenceRequirementType}) is required.` }, { status: 400 });
      }
    } else if (evidenceRequirementType === "system_record") {
      // Placeholder for specific system record checks
      if (!completionData) {
        return NextResponse.json({ error: "System record proof is required." }, { status: 400 });
      }
    }

    // Determine next status (Audit logic)
    // Very High -> Level 3 audit
    // High -> Level 2 audit
    // Medium -> Level 1 audit
    // Low -> No audit needed
    let nextStatus: "completed" | "audit_pending" = "completed";
    if (task.priority === "medium" || task.priority === "high" || task.priority === "very_high") {
      nextStatus = "audit_pending";
    }

    const [updated] = await db.update(taskInstances).set({
      status: nextStatus,
      completionProofUrl,
      completionData,
      completedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(taskInstances.id, taskId)).returning();

    return NextResponse.json({ task: updated }, { status: 200 });
  } catch (error: any) {
    console.error("POST task complete error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
