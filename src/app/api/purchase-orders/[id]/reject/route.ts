import { NextResponse } from "next/server";
import { db } from "@/db";
import { purchaseOrders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuthenticatedUser } from "@/lib/authorization";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const user = await requireAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [updatedPo] = await db
      .update(purchaseOrders)
      .set({ status: 'rejected', updatedAt: new Date() })
      .where(eq(purchaseOrders.id, resolvedParams.id))
      .returning();

    if (!updatedPo) {
      return NextResponse.json({ error: "Purchase Order not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, po: updatedPo });
  } catch (error) {
    console.error("Failed to reject PO:", error);
    return NextResponse.json({ error: "Failed to reject PO" }, { status: 500 });
  }
}
