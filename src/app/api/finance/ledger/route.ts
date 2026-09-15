import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/authorization";
import { getVendorLedger } from "@/domains/finance/service";

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

    const ledger = await getVendorLedger(
      { id: user.id }, 
      { organizationId, locationId },
      vendorId
    );
    return NextResponse.json(ledger);
  } catch (error: any) {
    if (error.code === "ACCESS_DENIED") return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
