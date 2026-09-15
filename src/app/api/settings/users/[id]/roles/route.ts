import { NextResponse } from "next/server";
import { db } from "@/db";
import { organizationRoleAssignments, roles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuthenticatedUser } from "@/lib/authorization";
import { getOrganizationForUser } from "@/lib/get-organization-for-user";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orgId = await getOrganizationForUser(user.id);
    if (!orgId) return NextResponse.json({ error: "No organization found" }, { status: 400 });

    const { id: userId } = await params;

    const assignedRoles = await db.select({
      id: roles.id,
      name: roles.name,
      code: roles.code,
    })
    .from(organizationRoleAssignments)
    .innerJoin(roles, eq(organizationRoleAssignments.roleId, roles.id))
    .where(and(eq(organizationRoleAssignments.userId, userId), eq(organizationRoleAssignments.organizationId, orgId)));

    return NextResponse.json(assignedRoles);
  } catch (error) {
    console.error("Failed to fetch user roles:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orgId = await getOrganizationForUser(user.id);
    if (!orgId) return NextResponse.json({ error: "No organization found" }, { status: 400 });

    const { id: userId } = await params;
    const body = await request.json();
    const { roleId, enabled } = body;

    if (!roleId || typeof enabled !== "boolean") {
      return NextResponse.json({ error: "roleId and enabled are required" }, { status: 400 });
    }

    if (enabled) {
      // Assign role
      const exists = await db.select().from(organizationRoleAssignments)
        .where(and(eq(organizationRoleAssignments.userId, userId), eq(organizationRoleAssignments.organizationId, orgId), eq(organizationRoleAssignments.roleId, roleId)))
        .limit(1);
      
      if (exists.length === 0) {
        await db.insert(organizationRoleAssignments).values({ userId, organizationId: orgId, roleId });
      }
    } else {
      // Unassign role
      await db.delete(organizationRoleAssignments)
        .where(and(eq(organizationRoleAssignments.userId, userId), eq(organizationRoleAssignments.organizationId, orgId), eq(organizationRoleAssignments.roleId, roleId)));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update user role:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
