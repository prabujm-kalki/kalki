import { NextResponse } from "next/server";
import { db } from "@/db";
import { departments } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireAuthenticatedUser } from "@/lib/authorization";

export async function GET(request: Request) {
  try {
    await requireAuthenticatedUser(request);
    const url = new URL(request.url);
    const organizationId = url.searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json({ error: "organizationId is required" }, { status: 400 });
    }

    const orgDepartments = await db
      .select({
        id: departments.id,
        name: departments.name,
        code: departments.code,
        isActive: departments.isActive,
      })
      .from(departments)
      .where(eq(departments.organizationId, organizationId));

    return NextResponse.json({ departments: orgDepartments });
  } catch (error) {
    console.error("Failed to fetch departments:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAuthenticatedUser(request);
    const body = await request.json();
    const { organizationId, name, code } = body;

    if (!organizationId || !name || !code) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const [newDept] = await db.insert(departments).values({
      organizationId,
      name,
      code,
      isActive: true,
    }).returning();

    return NextResponse.json({ department: newDept });
  } catch (error) {
    console.error("Failed to create department:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAuthenticatedUser(request);
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const body = await request.json();
    const { name, code, isActive } = body;

    const [updated] = await db.update(departments)
      .set({
        ...(name !== undefined && { name }),
        ...(code !== undefined && { code }),
        ...(isActive !== undefined && { isActive }),
        updatedAt: new Date(),
      })
      .where(eq(departments.id, id))
      .returning();

    return NextResponse.json({ department: updated });
  } catch (error) {
    console.error("Failed to update department:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
