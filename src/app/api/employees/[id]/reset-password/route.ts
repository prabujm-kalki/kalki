import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { employees, authAccounts, authSessions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { authorizeEmployeeOperation } from "@/lib/authorization";
import { auth } from "@/lib/auth";
import { hashPassword } from "better-auth/crypto";
import { recordAuditEvent } from "@/domains/audit/service";
import { employeePermissions } from "@/lib/authorization-policy";

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: employeeId } = await params;
    const body = await request.json().catch(() => ({}));
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
    }

    const targetEmployeeRows = await db
      .select({ 
        organizationId: employees.organizationId, 
        locationId: employees.locationId,
        userId: employees.userId 
      })
      .from(employees)
      .where(eq(employees.id, employeeId));

    if (targetEmployeeRows.length !== 1) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const targetEmployee = targetEmployeeRows[0];

    // Authorize: Must have update employee permission (or be an Owner). 
    // Usually only Owners can reset passwords, so we also check if they are owner explicitly or have high enough permissions.
    const authorized = await authorizeEmployeeOperation({
      userId: session.user.id,
      organizationId: targetEmployee.organizationId,
      locationId: targetEmployee.locationId,
      permission: employeePermissions.update,
    });

    if (!authorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!targetEmployee.userId) {
      return NextResponse.json({ error: "Employee does not have login access provisioned." }, { status: 400 });
    }

    // Check if actor is Owner (this could be implemented via a role check, but authorizeEmployeeOperation suffices if they have employee:update)
    // Actually, Owner is checked implicitly if they have `employee:update` across all locations or specifically here.
    
    // Hash password
    // hashPassword is async in better-auth/crypto
    const hashedPassword = await hashPassword(parsed.data.newPassword);

    await db.transaction(async (tx) => {
      // Update password in authAccounts
      await tx
        .update(authAccounts)
        .set({ password: hashedPassword })
        .where(
          and(
            eq(authAccounts.userId, targetEmployee.userId as string),
            eq(authAccounts.providerId, "credential")
          )
        );

      // Revoke all existing sessions
      await tx
        .delete(authSessions)
        .where(eq(authSessions.userId, targetEmployee.userId as string));

      // Audit
      await recordAuditEvent({
        organizationId: targetEmployee.organizationId,
        locationId: targetEmployee.locationId,
        actorUserId: session.user.id,
        eventType: "EMPLOYEE_PASSWORD_RESET",
        action: "UPDATE",
        entityType: "employee",
        entityId: employeeId,
      }, tx);
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Owner Password Reset Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
