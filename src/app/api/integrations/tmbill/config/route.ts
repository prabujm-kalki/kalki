import { NextResponse } from "next/server";
import { db } from "@/db";
import { tmbillConfigs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");
    
    if (!organizationId) {
      return NextResponse.json({ error: "Missing organizationId" }, { status: 400 });
    }

    const [config] = await db.select().from(tmbillConfigs).where(eq(tmbillConfigs.organizationId, organizationId)).limit(1);
    
    return NextResponse.json(config || {});
  } catch (error: any) {
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { organizationId, apiUrl, username, password, storeId, tmposId, businessDayStartTime, autoSyncEnabled, autoSyncIntervalMinutes } = body;

    if (!organizationId) {
      return NextResponse.json({ error: "Missing organizationId" }, { status: 400 });
    }

    const [existing] = await db.select().from(tmbillConfigs).where(eq(tmbillConfigs.organizationId, organizationId)).limit(1);

    if (existing) {
      await db.update(tmbillConfigs).set({
        apiUrl,
        username,
        password,
        storeId,
        tmposId,
        businessDayStartTime,
        autoSyncEnabled,
        autoSyncIntervalMinutes,
        updatedAt: new Date()
      }).where(eq(tmbillConfigs.id, existing.id));
    } else {
      await db.insert(tmbillConfigs).values({
        id: randomUUID(),
        organizationId,
        apiUrl,
        username,
        password,
        storeId,
        tmposId,
        businessDayStartTime,
        autoSyncEnabled,
        autoSyncIntervalMinutes
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
