import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { purchaseOrders, purchaseOrderLines, items, vendors, vendorItems } from "@/db/schema";
import { auth } from "@/lib/auth";
import { getSessionContext } from "@/domains/session/service";
import { eq, and, gt } from "drizzle-orm";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "PO ID is required" }, { status: 400 });
    }

    const context = await getSessionContext(session.user);
    const userOrgIds = context.scopes.map((s) => s.organizationId);

    const poQuery = await db
      .select({
        po: purchaseOrders,
        vendorName: vendors.name,
      })
      .from(purchaseOrders)
      .innerJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
      .where(eq(purchaseOrders.id, id))
      .limit(1);

    if (poQuery.length === 0) {
      return NextResponse.json({ error: "PO not found" }, { status: 404 });
    }

    const po = poQuery[0].po;
    if (!context.isOwner && !userOrgIds.includes(po.organizationId)) {
      return NextResponse.json({ error: "Unauthorized access to PO" }, { status: 403 });
    }
    
    // Only fetch lines that were actually received
    const lines = await db
      .select({
        line: purchaseOrderLines,
        itemName: items.nameEn,
        purchaseUnit: items.purchaseUnit,
        baseUnit: items.unit,
        vendorItemLastRate: vendorItems.lastRate,
      })
      .from(purchaseOrderLines)
      .innerJoin(items, eq(purchaseOrderLines.itemId, items.id))
      .leftJoin(
        vendorItems, 
        and(
          eq(vendorItems.itemId, items.id),
          eq(vendorItems.vendorId, po.vendorId)
        )
      )
      .where(
        and(
          eq(purchaseOrderLines.poId, id),
          gt(purchaseOrderLines.receivedQuantity, '0')
        )
      );

    return NextResponse.json({
      po,
      vendorName: poQuery[0].vendorName,
      lines: lines.map(l => ({
        ...l.line,
        itemName: l.itemName,
        purchaseUnit: l.purchaseUnit,
        baseUnit: l.baseUnit,
        suggestedRate: l.vendorItemLastRate || l.line.unitRate || "0",
      }))
    });
  } catch (error: any) {
    console.error("Error fetching PO cashier details:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
