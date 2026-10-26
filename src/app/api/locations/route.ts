import { NextResponse } from "next/server";
import { db } from "@/db";
import { locations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuthenticatedUser } from "@/lib/authorization";

export async function GET(request: Request) {
  try {
    const session = await requireAuthenticatedUser(request);
    const url = new URL(request.url);
    const organizationId = url.searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json({ error: "organizationId is required" }, { status: 400 });
    }

    const orgLocations = await db
      .select({
        id: locations.id,
        name: locations.name,
        code: locations.code,
        isActive: locations.isActive,
      })
      .from(locations)
      .where(eq(locations.organizationId, organizationId));

    return NextResponse.json({ locations: orgLocations });
  } catch (error) {
    console.error("Failed to fetch locations:", error);
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

    const [newLoc] = await db.insert(locations).values({
      organizationId,
      name,
      code,
      isActive: true,
    }).returning();

    return NextResponse.json({ location: newLoc });
  } catch (error) {
    console.error("Failed to create location:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAuthenticatedUser(request);
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Location id is required" }, { status: 400 });
    }

    const body = await request.json();
    const [updatedLoc] = await db
      .update(locations)
      .set({
        ...(body.name && { name: body.name }),
        ...(body.code && { code: body.code }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        updatedAt: new Date(),
      })
      .where(eq(locations.id, id))
      .returning();

    return NextResponse.json({ location: updatedLoc });
  } catch (error) {
    console.error("Failed to update location:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

