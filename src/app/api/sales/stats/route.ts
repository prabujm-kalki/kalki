import { requireAuthenticatedUser } from "@/lib/authorization";
import { getSalesStats } from "@/domains/sales/service";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(req);
    const locationId = req.nextUrl.searchParams.get("locationId");

    if (!user || !locationId) {
      return NextResponse.json({ error: "Unauthorized or missing location" }, { status: 401 });
    }

    const stats = await getSalesStats(locationId);
    return NextResponse.json(stats);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
