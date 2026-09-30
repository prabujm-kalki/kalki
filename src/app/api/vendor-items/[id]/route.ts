import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/authorization";
import { removeVendorItem, InventoryServiceError } from "@/domains/inventory/service";
import { NextRequest } from "next/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireAuthenticatedUser(request);
    if (!actor) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const { id } = await params;
    
    // We expect organizationId and locationId in query params, or we can get them from body.
    // For simplicity with DELETE, let's parse from URL.
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");
    const locationId = searchParams.get("locationId");

    if (!organizationId || !locationId) {
      return NextResponse.json({ error: "Missing required query parameters" }, { status: 400 });
    }

    await removeVendorItem(actor, { organizationId, locationId }, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof InventoryServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
