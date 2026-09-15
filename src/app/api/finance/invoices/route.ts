import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/authorization";
import { recordSupplierInvoice, getVendorInvoices } from "@/domains/finance/service";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const invoice = await recordSupplierInvoice({ id: user.id }, body);
    return NextResponse.json(invoice);
  } catch (error: any) {
    if (error.code === "ACCESS_DENIED") return NextResponse.json({ error: error.message }, { status: 403 });
    if (error.code === "INVALID_INPUT") return NextResponse.json({ error: error.message }, { status: 400 });
    if (error.code === "DUPLICATE_RECORD") return NextResponse.json({ error: error.message }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const searchParams = req.nextUrl.searchParams;
    
    const organizationId = searchParams.get("organizationId");
    const locationId = searchParams.get("locationId");
    const vendorId = searchParams.get("vendorId");

    if (!organizationId || !locationId || !vendorId) {
      return NextResponse.json({ error: "organizationId, locationId, and vendorId are required" }, { status: 400 });
    }

    const invoices = await getVendorInvoices(
      { id: user.id }, 
      { organizationId, locationId },
      vendorId
    );
    return NextResponse.json(invoices);
  } catch (error: any) {
    if (error.code === "ACCESS_DENIED") return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
