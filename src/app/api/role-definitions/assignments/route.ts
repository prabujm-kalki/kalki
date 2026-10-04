import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/authorization";
import { db } from "@/db";
import { employeeRoleAssignments, employees, people } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  const user = await requireAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  
  const organizationId = new URL(request.url).searchParams.get("organizationId");
  if (!organizationId) return NextResponse.json({ error: "Missing organizationId" }, { status: 400 });

  try {
    const assignments = await db
      .select({
        roleId: employeeRoleAssignments.roleId,
        employeeId: employees.id,
        displayName: people.displayName,
      })
      .from(employeeRoleAssignments)
      .innerJoin(employees, eq(employeeRoleAssignments.employeeId, employees.id))
      .innerJoin(people, eq(employees.personId, people.id))
      .where(eq(employeeRoleAssignments.organizationId, organizationId));

    return NextResponse.json({ assignments });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 });
  }
}
