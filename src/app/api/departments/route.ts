import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/authorization";
import { db } from "@/db";
import { departments } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request);
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");
    if (!organizationId) return new NextResponse("Missing organizationId", { status: 400 });

    const results = await db
      .select()
      .from(departments)
      .where(eq(departments.organizationId, organizationId))
      .orderBy(departments.name);

    return NextResponse.json({ departments: results });
  } catch (err) {
    console.error("GET /api/departments error:", err);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request);
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const body = await request.json();
    const { organizationId, name, code } = body;
    if (!organizationId || !name || !code) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const [created] = await db
      .insert(departments)
      .values({ organizationId, name, code, isActive: true })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("POST /api/departments error:", err);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request);
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return new NextResponse("Missing id", { status: 400 });

    const body = await request.json();
    const { name, code, isActive } = body;

    const [updated] = await db
      .update(departments)
      .set({
        ...(name !== undefined && { name }),
        ...(code !== undefined && { code }),
        ...(isActive !== undefined && { isActive }),
        updatedAt: new Date(),
      })
      .where(eq(departments.id, id))
      .returning();

    if (!updated) return new NextResponse("Not Found", { status: 404 });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("PATCH /api/departments error:", err);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
