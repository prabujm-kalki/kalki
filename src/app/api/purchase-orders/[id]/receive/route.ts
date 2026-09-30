import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { purchaseOrders, purchaseOrderLines } from "@/db/schema";
import { requireAuthenticatedUser } from "@/lib/authorization";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { receivedLines } = await req.json();

    if (!receivedLines || !Array.isArray(receivedLines)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Verify PO
    const [po] = await db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, id));

    if (!po) {
      return NextResponse.json({ error: "PO not found" }, { status: 404 });
    }

    // Update lines
    for (const line of receivedLines) {
      let status = 'PENDING';
      const rQty = Number(line.receivedQuantity);
      const oQty = Number(line.orderedQuantity);
      
      if (rQty === 0) status = 'NOT_RECEIVED';
      else if (rQty === oQty) status = 'OK';
      else status = 'MODIFIED';

      await db.update(purchaseOrderLines)
        .set({
          receivedQuantity: rQty.toString(),
          receivingStatus: status,
        })
        .where(eq(purchaseOrderLines.id, line.id));
    }

    // Update PO status
    await db.update(purchaseOrders)
      .set({ status: 'received' })
      .where(eq(purchaseOrders.id, id));

    return NextResponse.json({ message: "Goods receipt processed successfully" });
  } catch (error: any) {
    console.error("Error receiving PO:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
