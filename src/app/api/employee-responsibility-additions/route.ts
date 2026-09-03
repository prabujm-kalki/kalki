import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createEmployeeResponsibilityAddition,
  getEmployeeResponsibilityAddition,
  listEmployeeResponsibilityAdditions,
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
    const addition = params.id
      ? await getEmployeeResponsibilityAddition(user, scope.data, params.id)
      : undefined;
    return NextResponse.json(
      addition
        ? { addition }
        : { additions: await listEmployeeResponsibilityAdditions(user, scope.data) },
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
      { addition: await createEmployeeResponsibilityAddition(user, await request.json()) },
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
