import { NextResponse } from "next/server";
import { db } from "@/db";
import { taskDefinitions } from "@/db/schema";
import { eq } from "drizzle-orm";
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

    return NextResponse.json(definitions);
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
      module: body.module,
      title: body.title,
      description: body.description,
      triggerType: body.triggerType,
      triggerConfig: body.triggerConfig || {},
      targetRoleId: body.targetRoleId || null,
      targetUserId: body.targetUserId || null,
      actionType: body.actionType || "task",
      contextTemplate: body.contextTemplate || {},
    }).returning();

    return NextResponse.json(newDef);
  } catch (error) {
    console.error("Failed to create task definition:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
