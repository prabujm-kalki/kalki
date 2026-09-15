import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/authorization";
import { createVendor, listVendors, updateVendor, InventoryServiceError } from "@/domains/inventory/service";

export async function GET(request: Request) {
  try {
    const actor = await requireAuthenticatedUser(request);
    if (!actor) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");
    const locationId = searchParams.get("locationId");

    if (!organizationId || !locationId) {
      return NextResponse.json({ error: "Missing required query parameters" }, { status: 400 });
    }

    const items = await listVendors(actor, { organizationId, locationId });
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
    const vendor = await createVendor(actor, body);
    return NextResponse.json({ vendor }, { status: 201 });
  } catch (error) {
    if (error instanceof InventoryServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const actor = await requireAuthenticatedUser(request);
    if (!actor) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get("id");
    if (!vendorId) {
      return NextResponse.json({ error: "Missing vendor id" }, { status: 400 });
    }
    const body = await request.json();
    const vendor = await updateVendor(actor, { ...body, vendorId });
    return NextResponse.json({ vendor });
  } catch (error) {
    if (error instanceof InventoryServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
