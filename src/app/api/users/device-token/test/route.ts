import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { userDeviceTokens } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { sendNativePushNotification } from "@/lib/pushNotificationSender";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const devices = await db
      .select()
      .from(userDeviceTokens)
      .where(eq(userDeviceTokens.userId, userId));

    if (devices.length === 0) {
      return NextResponse.json({
        success: false,
        message: "No registered mobile phone found for your account. Please log in on the mobile app first.",
      });
    }

    const result = await sendNativePushNotification(userId, {
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
