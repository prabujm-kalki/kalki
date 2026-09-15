import { NextResponse } from "next/server";
import { db } from "@/db";
import { departments } from "@/db/schema";
import { requireAuthenticatedUser } from "@/lib/authorization";
import { getOrganizationForUser } from "@/lib/get-organization-for-user";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orgId = await getOrganizationForUser(user.id);
    if (!orgId) return NextResponse.json({ error: "No organization found" }, { status: 400 });

    const allDepartments = await db.select().from(departments).where(eq(departments.organizationId, orgId));
    return NextResponse.json(allDepartments);
  } catch (error) {
    console.error("Failed to fetch departments:", error);
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
    const { name, code } = body;

    if (!name || !code) {
      return NextResponse.json({ error: "Name and code are required" }, { status: 400 });
    }

    const [newDepartment] = await db.insert(departments).values({
      organizationId: orgId,
      name,
      code,
    }).returning();

    return NextResponse.json(newDepartment);
  } catch (error) {
    console.error("Failed to create department:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
