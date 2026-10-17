import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { userDeviceTokens } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { token, deviceType = "android", deviceName } = body;

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const userId = session.user.id;

    // Check if token already exists
    const [existing] = await db
      .select()
      .from(userDeviceTokens)
      .where(eq(userDeviceTokens.deviceToken, token))
      .limit(1);

    if (existing) {
      await db
        .update(userDeviceTokens)
        .set({
          userId,
          deviceType,
          deviceName: deviceName || existing.deviceName,
          isActive: true,
          lastActiveAt: new Date(),
        })
        .where(eq(userDeviceTokens.id, existing.id));

      return NextResponse.json({ success: true, updated: true });
    }

    await db.insert(userDeviceTokens).values({
      userId,
      deviceToken: token,
      deviceType,
      deviceName: deviceName || null,
      isActive: true,
      lastActiveAt: new Date(),
    });

    return NextResponse.json({ success: true, registered: true });
  } catch (error: any) {
    console.error("[registerDeviceToken API Error]:", error);
    return NextResponse.json({ error: error.message || "Failed to register token" }, { status: 500 });
  }
}
