import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/authorization";
import { getOrganizationForUser } from "@/lib/get-organization-for-user";
import {
  EmployeeServiceError,
  listEmployeeChangeRequests,
  proposeEmployeeChange,
} from "@/domains/employees/service";

function serviceErrorResponse(error: unknown) {
  if (!(error instanceof EmployeeServiceError)) throw error;
  const statusMap: Record<EmployeeServiceError["code"], number> = {
    AUTHENTICATION_REQUIRED: 401,
    ACCESS_DENIED: 403,
    INVALID_INPUT: 400,
    LOCATION_NOT_FOUND: 404,
    EMPLOYEE_NOT_FOUND: 404,
    DUPLICATE_EMPLOYEE_CODE: 409,
    INVALID_LIFECYCLE_TRANSITION: 400,
    CYCLE_DETECTED: 400,
    CROSS_ORG_REFERENCE: 400,
    CONCURRENT_REQUEST_PENDING: 409,
    REQUEST_NOT_FOUND: 404,
    REQUEST_NOT_PENDING: 400,
    STALE_REQUEST: 409,
  };
  return NextResponse.json(
    { error: error.message, code: error.code },
    { status: statusMap[error.code] || 400 }
  );
}

export async function GET(request: Request) {
  try {
    const actor = await requireAuthenticatedUser(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const organizationId = await getOrganizationForUser(actor.id);
    if (!organizationId) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId") || undefined;

    const data = await listEmployeeChangeRequests(actor, organizationId, employeeId);
    return NextResponse.json({ data });
  } catch (error) {
    return serviceErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireAuthenticatedUser(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { employeeId, reason, ...input } = body;

    if (!employeeId || typeof employeeId !== "string") {
      return NextResponse.json({ error: "employeeId is required" }, { status: 400 });
    }
    if (!reason || typeof reason !== "string") {
      return NextResponse.json({ error: "reason is required" }, { status: 400 });
    }

    const data = await proposeEmployeeChange(actor, employeeId, input, reason);
    return NextResponse.json({ data });
  } catch (error) {
    return serviceErrorResponse(error);
  }
}
