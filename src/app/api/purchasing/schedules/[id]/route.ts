import { NextResponse } from "next/server";
import { db } from "@/db";
import { purchaseSchedules } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      organizationId,
      locationId,
      vendorId,
      responsibleRoleId,
      frequencyRule,
      reminderTime,
    } = body;

    const [updated] = await db
      .update(purchaseSchedules)
      .set({
        organizationId,
        locationId,
        vendorId,
        responsibleRoleId,
        frequencyRule,
        reminderTime,
        updatedAt: new Date(),
      })
      .where(eq(purchaseSchedules.id, id))
      .returning();

    return NextResponse.json({ success: true, schedule: updated });
  } catch (error: any) {
    console.error("Failed to update schedule:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db
      .delete(purchaseSchedules)
      .where(eq(purchaseSchedules.id, id));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete schedule:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
