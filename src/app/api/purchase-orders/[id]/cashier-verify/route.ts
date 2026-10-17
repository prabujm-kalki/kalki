import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { purchaseOrders, purchaseOrderLines, vendorItems } from "@/db/schema";
import { auth } from "@/lib/auth";
import { getSessionContext } from "@/domains/session/service";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { 
      verifiedLines, 
      cashierBillAmount, 
      cashierPaymentMethod, 
      cashierAttachments, 
      calculatedTotal 
    } = await req.json();

    if (!verifiedLines || !Array.isArray(verifiedLines) || !cashierBillAmount || !cashierPaymentMethod) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const context = await getSessionContext(session.user);
    const userOrgIds = context.scopes.map((s) => s.organizationId);

    // Verify PO
    const [po] = await db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, id));

    if (!po) {
      return NextResponse.json({ error: "PO not found" }, { status: 404 });
    }

    if (!context.isOwner && !userOrgIds.includes(po.organizationId)) {
      return NextResponse.json({ error: "Unauthorized access to PO" }, { status: 403 });
    }

    // Update lines and update vendor lastRate
    for (const line of verifiedLines) {
      const vRate = Number(line.verifiedUnitRate);

      await db.update(purchaseOrderLines)
        .set({
          verifiedUnitRate: vRate.toString(),
        })
        .where(eq(purchaseOrderLines.id, line.id));

      // Update lastRate in vendorItems
      await db.update(vendorItems)
        .set({ lastRate: vRate.toString() })
        .where(
          and(
            eq(vendorItems.vendorId, po.vendorId),
            eq(vendorItems.itemId, line.itemId)
          )
        );
    }

    // Update PO status to accounts_pending
    await db.update(purchaseOrders)
      .set({
        status: "accounts_pending",
        cashierBillAmount: Number(cashierBillAmount).toString(),
        cashierPaymentMethod,
        cashierAttachments: cashierAttachments || null,
      })
      .where(eq(purchaseOrders.id, id));

    return NextResponse.json({ message: "Verification completed successfully" });
  } catch (error: any) {
    console.error("Error verifying PO:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
