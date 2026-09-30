import { NextResponse } from "next/server";
import { db } from "@/db";
import { employeeExits, employees } from "@/db/schema";
import { requireAuthenticatedUser } from "@/lib/authorization";
import { eq } from "drizzle-orm";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser(request);
    const resolvedParams = await params;
    const { id } = resolvedParams;
    
    const body = await request.json();
    const { status, approvedLastWorkingDay, reviewComment } = body;

    if (!id || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate status
    const validStatuses = ["PENDING", "APPROVED", "REJECTED", "WITHDRAWN", "COMPLETED"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const updateData: any = { 
      status, 
      updatedAt: new Date() 
    };

    if (approvedLastWorkingDay) updateData.approvedLastWorkingDay = new Date(approvedLastWorkingDay).toISOString();
    if (reviewComment !== undefined) updateData.reviewComment = reviewComment;

    // Get the employeeId who is approving it (this would normally be linked to the current user's employee record)
    // For now, we omit approvedBy unless we lookup the employee record for `user.id`.

    const [updatedExit] = await db.update(employeeExits)
      .set(updateData)
      .where(eq(employeeExits.id, id))
      .returning();

    // If marked as COMPLETED, also update the employee status to EXITED
    if (status === "COMPLETED" && updatedExit) {
      await db.update(employees)
        .set({ status: "EXITED", updatedAt: new Date() })
        .where(eq(employees.id, updatedExit.employeeId));
    }
    
    // If marked as REJECTED or WITHDRAWN, revert employee status back to ACTIVE
    if ((status === "REJECTED" || status === "WITHDRAWN" || status === "CANCELLED") && updatedExit) {
      await db.update(employees)
        .set({ status: "ACTIVE", updatedAt: new Date() })
        .where(eq(employees.id, updatedExit.employeeId));
    }

    // If marked as APPROVED, ensure they are in NOTICE_PERIOD
    if (status === "APPROVED" && updatedExit) {
      await db.update(employees)
        .set({ status: "NOTICE_PERIOD", updatedAt: new Date() })
        .where(eq(employees.id, updatedExit.employeeId));
    }

    return NextResponse.json({ success: true, exitRequest: updatedExit });
  } catch (error: any) {
    console.error("Failed to update exit request:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser(request);
    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

    const [deleted] = await db.delete(employeeExits).where(eq(employeeExits.id, id)).returning();

    if (deleted) {
      await db.update(employees)
        .set({ status: "ACTIVE", updatedAt: new Date() })
        .where(eq(employees.id, deleted.employeeId));
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete exit request:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
