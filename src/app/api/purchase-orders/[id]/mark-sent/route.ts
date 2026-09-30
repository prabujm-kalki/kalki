import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { purchaseOrders } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const [updatedPo] = await db.update(purchaseOrders)
      .set({ status: 'sent_to_vendor' })
      .where(eq(purchaseOrders.id, id))
      .returning();

    if (!updatedPo) {
      return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ message: "Marked as sent", po: updatedPo });
  } catch (error: any) {
    console.error("Error marking PO as sent:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
