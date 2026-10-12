import { NextResponse } from "next/server";
import { db } from "@/db";
import { tmbillConfigs } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");
    const locationId = searchParams.get("locationId");
    
    if (!organizationId) {
      return NextResponse.json({ error: "Missing organizationId" }, { status: 400 });
    }

    // 1. Try finding location-specific configuration first
    if (locationId && locationId !== "all" && locationId !== "null" && locationId !== "undefined") {
      const [locConfig] = await db
        .select()
        .from(tmbillConfigs)
        .where(
          and(
            eq(tmbillConfigs.organizationId, organizationId),
            eq(tmbillConfigs.locationId, locationId)
          )
        )
        .limit(1);

      if (locConfig) {
        return NextResponse.json(locConfig);
      }
      // If a specific location is selected but not configured yet, return blank
      return NextResponse.json({});
    }

    // 2. Fall back to organization-wide default (locationId is null)
    const [orgConfig] = await db
      .select()
      .from(tmbillConfigs)
      .where(
        and(
          eq(tmbillConfigs.organizationId, organizationId),
          isNull(tmbillConfigs.locationId)
        )
      )
      .limit(1);

    if (orgConfig) {
      return NextResponse.json(orgConfig);
    }

    return NextResponse.json({});
  } catch (error: any) {
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      organizationId,
      locationId: rawLocationId,
      providerName,
      apiUrl,
      username,
      password,
      storeId,
      tmposId,
      businessDayStartTime,
      autoSyncEnabled,
      autoSyncIntervalMinutes,
    } = body;

    if (!organizationId) {
      return NextResponse.json({ error: "Missing organizationId" }, { status: 400 });
    }

    const locationId = (rawLocationId && rawLocationId !== "all" && rawLocationId !== "null" && rawLocationId !== "undefined")
      ? rawLocationId
      : null;

    // Check if configuration exists for this exact organization and location
    const condition = locationId
      ? and(eq(tmbillConfigs.organizationId, organizationId), eq(tmbillConfigs.locationId, locationId))
      : and(eq(tmbillConfigs.organizationId, organizationId), isNull(tmbillConfigs.locationId));

    const [existing] = await db.select().from(tmbillConfigs).where(condition).limit(1);

    if (existing) {
      await db.update(tmbillConfigs).set({
        providerName: providerName || existing.providerName || "TMBILL",
        apiUrl,
        username,
        password,
        storeId,
        tmposId,
        businessDayStartTime,
        autoSyncEnabled,
        autoSyncIntervalMinutes,
        updatedAt: new Date(),
      }).where(eq(tmbillConfigs.id, existing.id));
    } else {
      await db.insert(tmbillConfigs).values({
        id: randomUUID(),
        organizationId,
        locationId,
        providerName: providerName || "TMBILL",
        apiUrl,
        username,
        password,
        storeId,
        tmposId,
        businessDayStartTime,
        autoSyncEnabled,
        autoSyncIntervalMinutes,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
