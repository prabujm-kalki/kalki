import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { employees, people } from "@/db/schema";
import {
  authorizeEmployeeOperation,
  requireAuthenticatedUser,
} from "@/lib/authorization";
import { employeePermissions } from "@/lib/authorization-policy";

const scopeSchema = z.object({
  organizationId: z.string().uuid(),
  locationId: z.string().uuid(),
});

export async function GET(request: Request) {
  const user = await requireAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const scope = scopeSchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams.entries()),
  );
  if (!scope.success) {
    return NextResponse.json({ error: "Organization and location are required" }, { status: 400 });
  }

  const authorized = await authorizeEmployeeOperation({
    userId: user.id,
    organizationId: scope.data.organizationId,
    locationId: scope.data.locationId,
    permission: employeePermissions.read,
  });
  if (!authorized) {
    return NextResponse.json({ error: "Employee access denied" }, { status: 403 });
  }

  const rows = await db
    .select({
      id: employees.id,
      employeeCode: employees.employeeCode,
      jobTitle: employees.jobTitle,
      employmentStartDate: employees.employmentStartDate,
      employmentEndDate: employees.employmentEndDate,
      isActive: employees.isActive,
      person: {
        id: people.id,
        firstName: people.firstName,
        lastName: people.lastName,
        displayName: people.displayName,
      },
    })
    .from(employees)
    .innerJoin(people, eq(people.id, employees.personId))
    .where(
      and(
        eq(employees.organizationId, scope.data.organizationId),
        eq(employees.locationId, scope.data.locationId),
      ),
    );

  return NextResponse.json({ employees: rows });
}
