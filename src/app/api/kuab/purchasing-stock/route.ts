import { NextResponse } from "next/server";
import { emitEvent } from "@/domains/kuab/service";

export async function POST(request: Request) {
  try {

    const body = await request.json();
    const { organizationId, locationId, vendorId, stockData } = body;

    if (!organizationId || !locationId || !vendorId || !stockData) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Emit the event to KUAB
    const event = await emitEvent({
      organizationId,
      eventType: "PURCHASING_STOCK_ENTERED",
      sourceModule: "PURCHASING",
      payload: {
        organizationId,
        locationId,
        vendorId,
        stockData,
      },
    });

    return NextResponse.json({ success: true, event });
  } catch (error: any) {
    console.error("KUAB API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
