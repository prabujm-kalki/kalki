import { db } from "@/db";
import { userDeviceTokens } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export interface NativePushPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
}

/**
 * Send native push notifications to all registered active devices of a user.
 * Supports task escalations, alerts, and system notices.
 */
export async function sendNativePushNotification(userId: string, payload: NativePushPayload) {
  try {
    const devices = await db
      .select()
      .from(userDeviceTokens)
      .where(and(eq(userDeviceTokens.userId, userId), eq(userDeviceTokens.isActive, true)));

    if (!devices || devices.length === 0) {
      return { success: false, reason: "No active devices registered for user" };
    }

    const tokens = devices.map((d) => d.deviceToken);

    // If FCM Server Key or Google ADC is configured, dispatch FCM HTTP v1 / Legacy payload
    const fcmServerKey = process.env.FCM_SERVER_KEY;
    if (fcmServerKey) {
      for (const token of tokens) {
        try {
          await fetch("https://fcm.googleapis.com/fcm/send", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `key=${fcmServerKey}`,
            },
            body: JSON.stringify({
              to: token,
              notification: {
                title: payload.title,
                body: payload.body,
                sound: "default",
                badge: "1",
              },
              data: payload.data || {},
              priority: "high",
            }),
          });
        } catch (fetchErr) {
          console.error(`[NativePush] Error dispatching to token ${token}:`, fetchErr);
        }
      }
    } else {
      console.log(`[NativePush] FCM_SERVER_KEY not set. Logged escalation notification for user ${userId} (${tokens.length} devices):`, payload);
    }

    return { success: true, deviceCount: tokens.length };
  } catch (err) {
    console.error("[NativePush] Failed to dispatch push notification:", err);
    return { success: false, error: err };
  }
}
