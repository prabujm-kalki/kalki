import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { purchaseOrders, purchaseOrderLines, items, vendors } from "@/db/schema";
import { auth } from "@/lib/auth";
import { getSessionContext } from "@/domains/session/service";
import { eq } from "drizzle-orm";

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

    const lines = await db
      .select({
        line: purchaseOrderLines,
        itemName: items.nameEn,
      })
      .from(purchaseOrderLines)
      .innerJoin(items, eq(purchaseOrderLines.itemId, items.id))
      .where(eq(purchaseOrderLines.poId, id));

    return NextResponse.json({
      po: po,
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
