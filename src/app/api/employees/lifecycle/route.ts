import { NextResponse } from "next/server";
import { transitionEmployeeLifecycle, EmployeeServiceError } from "@/domains/employees/service";
import { requireAuthenticatedUser } from "@/lib/authorization";

export async function POST(request: Request) {
  const user = await requireAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const employeeId = new URL(request.url).searchParams.get("id");
  if (!employeeId) {
    return NextResponse.json({ error: "Employee id is required" }, { status: 400 });
  }
  
  try {
    const employee = await transitionEmployeeLifecycle(user, employeeId, await request.json());
    return NextResponse.json({ employee });
  } catch (error) {
    return serviceErrorResponse(error);
  }
}

function serviceErrorResponse(error: unknown) {
  if (!(error instanceof EmployeeServiceError)) throw error;
  const status =
    error.code === "AUTHENTICATION_REQUIRED"
      ? 401
      : error.code === "INVALID_INPUT"
        ? 400
        : error.code === "EMPLOYEE_NOT_FOUND"
          ? 404
          : error.code === "DUPLICATE_EMPLOYEE_CODE"
            ? 409
            : error.code === "INVALID_LIFECYCLE_TRANSITION"
              ? 400
            : 403;
  return NextResponse.json({ error: error.message }, { status });
}
