import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { purchaseOrders } from "@/db/schema";
import { requireAuthenticatedUser } from "@/lib/authorization";
import { eq } from "drizzle-orm";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    let reason = "Cancelled by user";
    try {
      const body = await req.json();
      if (body.reason) reason = body.reason;
    } catch (e) {
      // json optional
    }

    const [po] = await db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, id));

    if (!po) {
      return NextResponse.json({ error: "Purchase Order not found" }, { status: 404 });
    }

    if (po.status === "completed") {
      return NextResponse.json({ error: "Cannot cancel a completed Purchase Order with processed invoice" }, { status: 400 });
    }

    const [updatedPo] = await db
      .update(purchaseOrders)
      .set({
        status: "cancelled",
        updatedAt: new Date(),
      })
      .where(eq(purchaseOrders.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      message: "Purchase Order cancelled successfully",
      po: updatedPo,
    });
  } catch (error: any) {
    console.error("Error cancelling PO:", error);
    return NextResponse.json(
      { error: error.message || "Failed to cancel PO" },
      { status: 500 }
    );
  }
}
