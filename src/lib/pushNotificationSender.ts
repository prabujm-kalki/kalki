import { db } from "@/db";
import { userDeviceTokens } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import admin from "firebase-admin";
import { getMessaging } from "firebase-admin/messaging";

export interface NativePushPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  soundKey?: string;
  level?: "level-1" | "level-2" | "level-3" | "level-4" | "level-5" | number | string;
}

// Initialize Firebase Admin SDK (singleton)
function getFirebaseAdmin() {
  const existingApps = admin.getApps ? admin.getApps() : (admin.apps || []);
  if (existingApps.length > 0) {
    return existingApps[0];
  }

  // 1. Try FIREBASE_SERVICE_ACCOUNT JSON string or file path
  let serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT;
  const fs = require("fs");
  const path = require("path");

  // Fallback to local file in cwd if env var is missing or empty
  if (!serviceAccountKey) {
    const candidatePath = path.join(process.cwd(), "firebase-service-account.json");
    if (fs.existsSync(candidatePath)) {
      serviceAccountKey = candidatePath;
    }
  }

  if (serviceAccountKey) {
    try {
      let parsed: any;
      if (typeof serviceAccountKey === "string" && serviceAccountKey.trim().startsWith("{")) {
        parsed = JSON.parse(serviceAccountKey);
      } else if (fs.existsSync(serviceAccountKey)) {
        parsed = JSON.parse(fs.readFileSync(serviceAccountKey, "utf-8"));
      } else {
        parsed = require(serviceAccountKey);
      }

      return admin.initializeApp({
        credential: admin.credential.cert(parsed),
      });
    } catch (e: any) {
      console.error("[NativePush] Failed to parse FIREBASE_SERVICE_ACCOUNT:", e?.message || e);
    }
  }

  // 2. Default application credentials
  try {
    return admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  } catch (e) {
    // Firebase not initialized
    return null;
  }
}

/**
 * Send native push notifications to all registered active devices of a user.
 * Dispatches to the matched Android Notification Channel so the target sound plays,
 * even when the device is locked.
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

    const app = getFirebaseAdmin();
    if (app) {
      const messaging = getMessaging(app);

      // Convert all data values to strings as required by FCM
      const stringData: Record<string, string> = {
        soundKey: soundName,
        channelId: channelId,
      };
      if (payload.data) {
        for (const [k, v] of Object.entries(payload.data)) {
          stringData[k] = String(v ?? "");
        }
      }

      for (const token of tokens) {
        try {
          await messaging.send({
            token,
            notification: {
              title: payload.title,
              body: payload.body,
            },
            android: {
              priority: "high",
              notification: {
                channelId: channelId,
                sound: soundName,
                priority: "max",
                visibility: "public",
                defaultVibrateTimings: true,
              },
            },
            data: stringData,
          });
        } catch (fetchErr: any) {
          console.error(`[NativePush] Error dispatching to token ${token}:`, fetchErr?.message || fetchErr);
        }
      }
      return { success: true, deviceCount: tokens.length };
    } else {
      console.log(`[NativePush] Firebase Admin not initialized. Logged alert [Channel: ${channelId}] for user ${userId}:`, payload);
      return { success: false, reason: "Firebase Admin not configured" };
    }
  } catch (err) {
    console.error("[NativePush] Failed to dispatch push notification:", err);
    return { success: false, error: err };
  }
}
