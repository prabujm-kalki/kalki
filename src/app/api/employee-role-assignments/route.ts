import { NextResponse } from "next/server";
import { z } from "zod";
import {
  assignEmployeeRole,
  getEmployeeRoleAssignment,
  listEmployeeRoleAssignments,
  removeEmployeeRole,
  RolesWorkServiceError,
} from "@/domains/roles-work/service";
import { requireAuthenticatedUser } from "@/lib/authorization";

const employeeScopeSchema = z.object({
  organizationId: z.string().uuid(),
  locationId: z.string().uuid(),
  employeeId: z.string().uuid(),
});

export async function GET(request: Request) {
  const user = await requireAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  const scope = employeeScopeSchema.safeParse(params);
  if (!scope.success) {
    return NextResponse.json(
      { error: "Organization, location, and employee are required" },
      { status: 400 },
    );
  }
  try {
    const assignment = params.id
      ? await getEmployeeRoleAssignment(user, scope.data, params.id)
      : undefined;
    return NextResponse.json(
      assignment
        ? { assignment }
        : { assignments: await listEmployeeRoleAssignments(user, scope.data) },
    );
  } catch (error) {
    return serviceErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const user = await requireAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  try {
    return NextResponse.json(
      { assignment: await assignEmployeeRole(user, await request.json()) },
      { status: 201 },
    );
  } catch (error) {
    return serviceErrorResponse(error);
  }
}

function serviceErrorResponse(error: unknown) {
  if (!(error instanceof RolesWorkServiceError)) throw error;
  const status = error.code === "AUTHENTICATION_REQUIRED" ? 401 : error.code === "INVALID_INPUT" ? 400 : error.code === "NOT_FOUND" ? 404 : error.code === "DUPLICATE_RECORD" ? 409 : 403;
  return NextResponse.json({ error: error.message }, { status });
}

export async function DELETE(request: Request) {
  const user = await requireAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  const scope = employeeScopeSchema.safeParse(params);
  if (!scope.success || !params.id) {
    return NextResponse.json({ error: "Organization, location, employee, and id are required" }, { status: 400 });
  }
  try {
    await removeEmployeeRole(user, scope.data, params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return serviceErrorResponse(error);
  }
}
