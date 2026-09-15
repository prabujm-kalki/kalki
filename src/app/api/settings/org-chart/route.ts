import { NextResponse } from "next/server";
import { db } from "@/db";
import { departments, businessRoles } from "@/db/schema";
import { requireAuthenticatedUser } from "@/lib/authorization";
import { getOrganizationForUser } from "@/lib/get-organization-for-user";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orgId = await getOrganizationForUser(user.id);
    if (!orgId) return NextResponse.json({ error: "No organization found" }, { status: 400 });

    const [allDepartments, allPositions] = await Promise.all([
      db.select().from(departments).where(eq(departments.organizationId, orgId)),
      db.select({
        id: businessRoles.id,
        identifier: businessRoles.identifier,
        name: businessRoles.name,
        departmentId: businessRoles.departmentId,
        reportsToRoleId: businessRoles.reportsToRoleId,
      }).from(businessRoles).where(eq(businessRoles.organizationId, orgId))
    ]);

    return NextResponse.json({ departments: allDepartments, positions: allPositions });
  } catch (error) {
    console.error("Failed to fetch org chart:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
