import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/authorization";
import { transferEmployeeBranch } from "@/domains/employees/transfer";

export async function POST(request: Request) {
  const user = await requireAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { employeeId, targetLocationId, effectiveDate, targetShiftId, targetRoleId, syncUserAccess, notes } = body;

    if (!employeeId || !targetLocationId || !effectiveDate) {
      return NextResponse.json(
        { error: "employeeId, targetLocationId, and effectiveDate are required." },
        { status: 400 }
      );
    }

    const result = await transferEmployeeBranch(user, {
      employeeId,
      targetLocationId,
      effectiveDate,
      targetShiftId,
      targetRoleId,
      syncUserAccess: syncUserAccess ?? true,
      notes,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to transfer employee branch:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to transfer employee branch" },
      { status: 400 }
    );
  }
}

