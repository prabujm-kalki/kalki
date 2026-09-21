import { NextResponse } from "next/server";
import { db } from "@/db";
import { locations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuthenticatedUser } from "@/lib/authorization";

export async function GET(request: Request) {
  try {
    const session = await requireAuthenticatedUser(request);
    const url = new URL(request.url);
    const organizationId = url.searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json({ error: "organizationId is required" }, { status: 400 });
    }

    const orgLocations = await db
      .select({
        id: locations.id,
        name: locations.name,
        code: locations.code,
      })
      .from(locations)
      .where(eq(locations.organizationId, organizationId));

    return NextResponse.json({ locations: orgLocations });
  } catch (error) {
    console.error("Failed to fetch locations:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
