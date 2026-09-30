import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { purchaseOrders, purchaseOrderLines, items, vendors } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const poQuery = await db
      .select({
        po: purchaseOrders,
        vendorName: vendors.name,
      })
      .from(purchaseOrders)
      .innerJoin(vendors, eq(purchaseOrders.vendorId, vendors.id))
      .where(
        and(
          eq(purchaseOrders.id, id),
          eq(purchaseOrders.organizationId, (session.user as any).organizationId)
        )
      )
      .limit(1);

    if (poQuery.length === 0) {
      return NextResponse.json({ error: "PO not found" }, { status: 404 });
    }

    const lines = await db
      .select({
        line: purchaseOrderLines,
        itemName: items.nameEn,
        
      })
      .from(purchaseOrderLines)
      .innerJoin(items, eq(purchaseOrderLines.itemId, items.id))
      .where(eq(purchaseOrderLines.poId, id));

    return NextResponse.json({
      po: poQuery[0].po,
      vendorName: poQuery[0].vendorName,
      lines: lines.map(l => ({
        ...l.line,
        itemName: l.itemName,
        
      }))
    });
  } catch (error: any) {
    console.error("Error fetching PO receive details:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
