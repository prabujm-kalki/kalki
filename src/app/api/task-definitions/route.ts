import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { taskDefinitions } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json({ error: "Organization required" }, { status: 400 });
    }

    const definitions = await db
      .select()
      .from(taskDefinitions)
      .where(eq(taskDefinitions.organizationId, organizationId));

    return NextResponse.json({ definitions });
  } catch (error: any) {
    console.error("GET task-definitions error:", error);
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
    const { 
      organizationId, module, title, description, triggerType, triggerConfig,
      priority, evidenceRequirementType, escalationPolicyId, targetUserId, targetRoleId
    } = body;

    if (!title || !organizationId || !triggerType || !module) {
      return NextResponse.json({ error: "Missing required blueprint fields" }, { status: 400 });
    }

    const [newDef] = await db.insert(taskDefinitions).values({
      organizationId,
      module,
      title,
      description,
      triggerType,
      triggerConfig: triggerConfig || {},
      targetUserId: targetUserId || null,
      targetRoleId: targetRoleId || null,
      priority: priority || "medium",
      evidenceRequirementType: evidenceRequirementType || "none",
      escalationPolicyId: escalationPolicyId || null,
      actionType: "task",
      contextTemplate: {},
      isActive: true,
    }).returning();

    return NextResponse.json({ definition: newDef }, { status: 201 });
  } catch (error: any) {
    console.error("POST task-definitions error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
