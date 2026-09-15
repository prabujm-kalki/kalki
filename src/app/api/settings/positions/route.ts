import { NextResponse } from "next/server";
import { db } from "@/db";
import { businessRoles } from "@/db/schema";
import { requireAuthenticatedUser } from "@/lib/authorization";
import { getOrganizationForUser } from "@/lib/get-organization-for-user";

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orgId = await getOrganizationForUser(user.id);
    if (!orgId) return NextResponse.json({ error: "No organization found" }, { status: 400 });

    const body = await request.json();
    const { name, identifier, purpose, departmentId, reportsToRoleId } = body;

    if (!name || !identifier) {
      return NextResponse.json({ error: "Name and identifier are required" }, { status: 400 });
    }

    const [newPosition] = await db.insert(businessRoles).values({
      organizationId: orgId,
      name,
      identifier,
      purpose: purpose || "Standard Position",
      departmentId: departmentId || null,
      reportsToRoleId: reportsToRoleId || null,
    }).returning();

    return NextResponse.json(newPosition);
  } catch (error) {
    console.error("Failed to create position:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
