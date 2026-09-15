import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/authorization";
import { createPurchaseSchedule, listPurchaseSchedules, InventoryServiceError } from "@/domains/inventory/service";

export async function GET(request: Request) {
  try {
    const actor = await requireAuthenticatedUser(request);
    if (!actor) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");
    const locationId = searchParams.get("locationId");
    const vendorId = searchParams.get("vendorId");

    if (!organizationId || !locationId) {
      return NextResponse.json({ error: "Missing required query parameters" }, { status: 400 });
    }

    const items = await listPurchaseSchedules(actor, { organizationId, locationId }, vendorId || undefined);
    return NextResponse.json({ items });
  } catch (error) {
    if (error instanceof InventoryServiceError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireAuthenticatedUser(request);
    if (!actor) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const body = await request.json();
    const item = await createPurchaseSchedule(actor, body);
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    if (error instanceof InventoryServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
