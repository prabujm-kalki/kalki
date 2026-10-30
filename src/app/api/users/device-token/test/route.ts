import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { userDeviceTokens, authUsers } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { sendNativePushNotification } from "@/lib/pushNotificationSender";

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // List all registered active devices with user info for admin inspection
    const devices = await db
      .select({
        id: userDeviceTokens.id,
        userId: userDeviceTokens.userId,
        userName: authUsers.name,
        userEmail: authUsers.email,
        deviceType: userDeviceTokens.deviceType,
        deviceName: userDeviceTokens.deviceName,
        isActive: userDeviceTokens.isActive,
        lastActiveAt: userDeviceTokens.lastActiveAt,
        createdAt: userDeviceTokens.createdAt,
      })
      .from(userDeviceTokens)
      .leftJoin(authUsers, eq(userDeviceTokens.userId, authUsers.id));

    return NextResponse.json({ success: true, devices });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let targetUserId = session.user.id;
    try {
      const body = await req.json();
      if (body?.userId) {
        targetUserId = body.userId;
      }
    } catch {
      // no body, defaults to session user
    }

    const devices = await db
      .select()
      .from(userDeviceTokens)
      .where(eq(userDeviceTokens.userId, targetUserId));

    if (devices.length === 0) {
      return NextResponse.json({
        success: false,
        message: "No registered mobile phone found for this account. Please log in on the mobile app first.",
      });
    }

    const result = await sendNativePushNotification(targetUserId, {
      title: "🚨 Kalki BOS Alert Test",
      body: "High-priority push received! Alarm sound is working on locked screen.",
      level: "level-5",
      data: { test: true },
    });

    return NextResponse.json({
      success: true,
      message: `Test push dispatched to ${devices.length} registered device(s)!`,
      result,
    });
  } catch (error: any) {
    console.error("[TestPush Error]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
