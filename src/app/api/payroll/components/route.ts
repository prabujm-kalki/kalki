import { NextResponse } from "next/server";
import { db } from "@/db";
import { salaryComponents } from "@/db/schema";
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

    const components = await db
      .select({
        id: salaryComponents.id,
        name: salaryComponents.name,
        type: salaryComponents.type,
        isTaxable: salaryComponents.isTaxable,
        isActive: salaryComponents.isActive,
      })
      .from(salaryComponents)
      .where(eq(salaryComponents.organizationId, organizationId));

    return NextResponse.json({ components });
  } catch (error) {
    console.error("Failed to fetch salary components:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAuthenticatedUser(request);
    const body = await request.json();
    const { organizationId, name, type, isTaxable } = body;

    if (!organizationId || !name || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const [newComp] = await db.insert(salaryComponents).values({
      organizationId,
      name,
      type,
      isTaxable: isTaxable ?? true,
      isActive: true,
    }).returning();

    return NextResponse.json({ component: newComp });
  } catch (error) {
    console.error("Failed to create salary component:", error);
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
    const { name, type, isTaxable, isActive } = body;

    const [updated] = await db.update(salaryComponents)
      .set({
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type }),
        ...(isTaxable !== undefined && { isTaxable }),
        ...(isActive !== undefined && { isActive }),
        updatedAt: new Date(),
      })
      .where(eq(salaryComponents.id, id))
      .returning();

    return NextResponse.json({ component: updated });
  } catch (error) {
    console.error("Failed to update salary component:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
