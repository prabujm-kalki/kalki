import { NextResponse } from "next/server";
import { db } from "@/db";
import { purchaseOrders } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { purchaseOrderLines, vendorItems } from "@/db/schema";
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

    const [currentPo] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, resolvedParams.id));
    if (!currentPo) {
      return NextResponse.json({ error: "Purchase Order not found" }, { status: 404 });
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      body = null;
    }
    
    const action = body?.action || 'accept';
    let nextStatus = 'approved';

    if (currentPo.status === 'audited') {
      if (action === 'reject') nextStatus = 'rejected';
      else if (action === 'return') nextStatus = 'pending_receipt';
      else nextStatus = 'completed';
    }

    if (body && body.lines && Array.isArray(body.lines)) {
      const hasInvalidItem = body.lines.some((l: any) => !l.itemId);
      if (hasInvalidItem) return NextResponse.json({ error: "Missing itemId in payload" }, { status: 400 });
      // User edited the lines before approving
      let newTotal = 0;
      await db.delete(purchaseOrderLines).where(eq(purchaseOrderLines.poId, resolvedParams.id));
      
      const newLines = body.lines.map((l: any) => {
        newTotal += (Number(l.orderedQuantity || 0) * Number(l.unitRate || 0)) || 0;
        return {
          poId: resolvedParams.id,
          itemId: l.itemId,
          orderedQuantity: String(l.orderedQuantity || 0),
          receivedQuantity: l.receivedQuantity != null ? String(l.receivedQuantity) : (currentPo.status === 'audited' ? String(l.orderedQuantity || 0) : null), 
          unitRate: String(l.unitRate || 0)
        };
      });
      
      if (newLines.length > 0) {
        await db.insert(purchaseOrderLines).values(newLines);
        
        // If the Manager is finally approving this and completing it, update the vendor's last rates
        if (nextStatus === 'completed') {
          for (const line of newLines) {
            if (Number(line.unitRate) > 0) {
              await db.update(vendorItems)
                .set({ lastRate: line.unitRate, updatedAt: new Date() })
                .where(and(eq(vendorItems.vendorId, currentPo.vendorId), eq(vendorItems.itemId, line.itemId)));
            }
          }
        }
      }
      
      const finalTotalAmount = currentPo.status === 'audited' ? currentPo.totalAmount : (newTotal > 0 ? newTotal.toString() : currentPo.totalAmount);
      
      const [updatedPo] = await db
        .update(purchaseOrders)
        .set({ status: nextStatus, totalAmount: finalTotalAmount, updatedAt: new Date() })
        .where(eq(purchaseOrders.id, resolvedParams.id))
        .returning();
      
      return NextResponse.json({ success: true, po: updatedPo });
    }

    // Default approval (no line changes)
    const [updatedPo] = await db
      .update(purchaseOrders)
      .set({ status: nextStatus, updatedAt: new Date() })
      .where(eq(purchaseOrders.id, resolvedParams.id))
      .returning();

    return NextResponse.json({ success: true, po: updatedPo });
  } catch (error) {
    console.error("Failed to approve PO:", error);
    return NextResponse.json({ error: "Failed to approve PO" }, { status: 500 });
  }
}
