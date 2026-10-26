import { db } from "@/db";
import { userDeviceTokens } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export interface NativePushPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  soundKey?: string;
  level?: "level-1" | "level-2" | "level-3" | "level-4" | "level-5" | number | string;
}

/**
 * Send native push notifications to all registered active devices of a user.
 * Dispatches to the matched Android Notification Channel so the target sound plays.
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

    // Resolve channel & sound
    let soundName = payload.soundKey || "default";
    if (!payload.soundKey && payload.level) {
      const lvlStr = String(payload.level).toLowerCase();
      if (lvlStr.includes("5")) soundName = "urgent_siren";
      else if (lvlStr.includes("4")) soundName = "alarm_horn";
      else if (lvlStr.includes("3")) soundName = "soft_chime";
      else if (lvlStr.includes("2")) soundName = "double_beep";
      else soundName = "bell_classic";
    }

    const channelId = soundName === "default" ? "kalki_sound_default" : `kalki_sound_${soundName}`;

    // If FCM Server Key or Google ADC is configured, dispatch FCM payload
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
                sound: soundName,
                android_channel_id: channelId,
                badge: "1",
              },
              android: {
                notification: {
                  channel_id: channelId,
                  sound: soundName,
                },
                priority: "high",
              },
              data: {
                ...(payload.data || {}),
                soundKey: soundName,
                channelId: channelId,
              },
              priority: "high",
            }),
          });
        } catch (fetchErr) {
          console.error(`[NativePush] Error dispatching to token ${token}:`, fetchErr);
        }
      }
    } else {
      console.log(`[NativePush] FCM_SERVER_KEY not set. Logged alert [Channel: ${channelId}] for user ${userId}:`, payload);
    }

    return { success: true, deviceCount: tokens.length };
  } catch (err) {
    console.error("[NativePush] Failed to dispatch push notification:", err);
    return { success: false, error: err };
  }
}
