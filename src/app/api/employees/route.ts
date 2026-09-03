import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createEmployee,
  EmployeeServiceError,
  getEmployee,
  listEmployees,
  updateEmployee,
} from "@/domains/employees/service";
import { requireAuthenticatedUser } from "@/lib/authorization";

const scopeSchema = z.object({
  organizationId: z.string().uuid(),
  locationId: z.string().uuid(),
});

export async function GET(request: Request) {
  const user = await requireAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const url = new URL(request.url);
  const employeeId = url.searchParams.get("id");
  try {
    if (employeeId) {
      return NextResponse.json({ employee: await getEmployee(user, employeeId) });
    }

    const scope = scopeSchema.safeParse(
      Object.fromEntries(url.searchParams.entries()),
    );
    if (!scope.success) {
      return NextResponse.json(
        { error: "Organization and location are required" },
        { status: 400 },
      );
    }
    return NextResponse.json({
      employees: await listEmployees(
        user,
        scope.data.organizationId,
        scope.data.locationId,
      ),
    });
  } catch (error) {
    return serviceErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const user = await requireAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const employee = await createEmployee(user, await request.json());
    return NextResponse.json({ employee }, { status: 201 });
  } catch (error) {
    return serviceErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  const user = await requireAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const employeeId = new URL(request.url).searchParams.get("id");
  if (!employeeId) {
    return NextResponse.json({ error: "Employee id is required" }, { status: 400 });
  }
  try {
    return NextResponse.json({
      employee: await updateEmployee(user, employeeId, await request.json()),
    });
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
