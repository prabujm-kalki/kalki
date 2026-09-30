import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { employees } from "@/db/schema";
import { requireAuthenticatedUser } from "@/lib/authorization";
import { eq, and } from "drizzle-orm";

const scopeSchema = z.object({
  organizationId: z.string().uuid(),
  locationId: z.string().uuid().optional(),
});

export async function GET(request: Request) {
  const user = await requireAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const url = new URL(request.url);
  const scope = scopeSchema.safeParse(
    Object.fromEntries(url.searchParams.entries()),
  );
  
  if (!scope.success) {
    return NextResponse.json(
      { error: "Organization is required" },
      { status: 400 },
    );
  }

  // Find the employee record for the current user
  let conditions = [
    eq(employees.userId, user.id),
    eq(employees.organizationId, scope.data.organizationId)
  ];
  
  if (scope.data.locationId) {
    conditions.push(eq(employees.locationId, scope.data.locationId));
  }

  const employeeRows = await db
    .select({ id: employees.id })
    .from(employees)
    .where(and(...conditions))
    .limit(1);

  if (employeeRows.length > 0) {
    return NextResponse.json({ employeeId: employeeRows[0].id });
  } else {
    return NextResponse.json({ employeeId: null });
  }
}
