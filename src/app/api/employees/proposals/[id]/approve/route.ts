import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/authorization";
import { EmployeeServiceError, approveEmployeeChange } from "@/domains/employees/service";

// TRANSCRIBED FROM COMPILED ARTIFACT .next/server/app/api/employees/proposals/[id]/approve/route.js

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

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAuthenticatedUser(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const { reviewComment } = body;
    const resolvedParams = await params;

    const data = await approveEmployeeChange(actor, resolvedParams.id, reviewComment);
    return NextResponse.json({ data });
  } catch (error) {
    return serviceErrorResponse(error);
  }
}
