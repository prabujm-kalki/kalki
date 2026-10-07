import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/authorization";
import { recordSupplierInvoice } from "@/domains/finance/service";
import { db } from "@/db";
import { purchaseOrders, employees } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { poId } = body;

    const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, poId));
    if (!po) return NextResponse.json({ error: "PO not found" }, { status: 404 });

    if (po.status !== "accounts_pending") {
      return NextResponse.json({ error: "PO is not in accounts pending status" }, { status: 400 });
    }

    const invoiceNumber = po.poNumber || `INV-${po.id.substring(0, 8).toUpperCase()}`;

    const [employee] = await db.select().from(employees).where(eq(employees.userId, user.id));
    if (!employee) return NextResponse.json({ error: "Employee record not found for this user" }, { status: 403 });

    // Record the invoice using the finance service
    await recordSupplierInvoice({ id: user.id }, {
      organizationId: po.organizationId,
      locationId: po.locationId,
      vendorId: po.vendorId,
      invoiceNumber: invoiceNumber,
      invoiceDate: new Date().toISOString(),
      dueDate: null, 
      totalAmount: parseFloat(po.cashierBillAmount || po.totalAmount),
      recordedByEmployeeId: employee.id
    });

    // Update PO status to completed
    await db.update(purchaseOrders).set({ status: 'completed' }).where(eq(purchaseOrders.id, poId));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Bill processing error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
