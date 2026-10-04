import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { taskDefinitions } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;

    // Implement soft-delete for 10-year scalable architecture, maintaining historical records.
    await db.update(taskDefinitions)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(taskDefinitions.id, id));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE task-definitions error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;
    const body = await req.json();

    const [updatedDef] = await db
      .update(taskDefinitions)
      .set({
        title: body.title,
        updatedAt: new Date()
      })
      .where(eq(taskDefinitions.id, id))
      .returning();

    return NextResponse.json({ definition: updatedDef });
  } catch (error: any) {
    console.error("PATCH task-definitions error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
