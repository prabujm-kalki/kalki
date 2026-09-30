import { NextResponse } from "next/server";
import { db } from "@/db";
import { purchaseOrders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { purchaseOrderLines } from "@/db/schema";
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

    // In a full implementation, we'd check if the user is authorized to approve this PO
    // and if there are tasks in the Task Engine that need to be resolved.
    
    // For now, we simply update the status in the database
    
    let body;
    try {
      body = await request.json();
    } catch (e) {
      body = null;
    }
    
    if (body && body.lines && Array.isArray(body.lines)) {
      const hasInvalidItem = body.lines.some((l: any) => !l.itemId);
      if (hasInvalidItem) return NextResponse.json({ error: "Missing itemId in payload" }, { status: 400 });
      // User edited the lines before approving
      let newTotal = 0;
      await db.delete(purchaseOrderLines).where(eq(purchaseOrderLines.poId, resolvedParams.id));
      
      const newLines = body.lines.map((l: any) => {
        newTotal += Number(l.orderedQuantity) * Number(l.unitRate);
        return {
          poId: resolvedParams.id,
          itemId: l.itemId,
          orderedQuantity: l.orderedQuantity.toString(),
          unitRate: l.unitRate.toString()
        };
      });
      
      if (newLines.length > 0) {
        await db.insert(purchaseOrderLines).values(newLines);
      }
      
      const [updatedPo] = await db
        .update(purchaseOrders)
        .set({ status: 'approved', totalAmount: newTotal.toString(), updatedAt: new Date() })
        .where(eq(purchaseOrders.id, resolvedParams.id))
        .returning();
      
      if (!updatedPo) {
        return NextResponse.json({ error: "Purchase Order not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, po: updatedPo });
    }

    // Default approval (no line changes)
    const [updatedPo] = await db
      .update(purchaseOrders)
      .set({ status: 'approved', updatedAt: new Date() })
      .where(eq(purchaseOrders.id, resolvedParams.id))
      .returning();


    if (!updatedPo) {
      return NextResponse.json({ error: "Purchase Order not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, po: updatedPo });
  } catch (error) {
    console.error("Failed to approve PO:", error);
    return NextResponse.json({ error: "Failed to approve PO" }, { status: 500 });
  }
}
