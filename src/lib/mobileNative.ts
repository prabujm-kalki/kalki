import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { CapacitorUpdater } from "@capgo/capacitor-updater";

/**
 * Report diagnostic checkpoints to both the browser console and server API
 */
export async function reportPushDiag(
  step: string,
  status: "INFO" | "SUCCESS" | "WARNING" | "ERROR",
  details?: any
) {
  const logPrefix = `[Mobile Diag][${status}] ${step}`;
  if (status === "ERROR") {
    console.error(logPrefix, details);
  } else if (status === "WARNING") {
    console.warn(logPrefix, details);
  } else {
    console.log(logPrefix, details);
  }

  try {
    await fetch("/api/users/device-token/diag", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        step,
        status,
        details: typeof details === "object" ? details : { message: String(details ?? "") },
      }),
    });
  } catch (err) {
    // silently catch network err so app never crashes
  }
}

/**
 * Run a full interactive diagnosis and return human-readable summary
 */
export async function runPushDiagnostics(): Promise<{
  isNative: boolean;
  platform: string;
  hasWindowCapacitor: boolean;
  permission?: any;
  token?: string;
  serverSync?: any;
  error?: string;
}> {
  const report: any = {
    isNative: Capacitor.isNativePlatform(),
    platform: Capacitor.getPlatform(),
    hasWindowCapacitor: typeof window !== "undefined" && Boolean((window as any).Capacitor),
  };

  await reportPushDiag("Manual Diagnostics Started", "INFO", report);

  if (!report.isNative) {
    const msg = "Not running inside a native Capacitor shell (Web Browser detected).";
    await reportPushDiag("Checkpoint 1: Native Shell Check", "WARNING", msg);
    return { ...report, error: msg };
  }

  await reportPushDiag("Checkpoint 1: Native Shell Check", "SUCCESS", { platform: report.platform });

  try {
    // Checkpoint 2: Check & Request Permissions
    let perm = await PushNotifications.checkPermissions();
    await reportPushDiag("Checkpoint 2: Initial Push Permission", "INFO", perm);

    if (perm.receive !== "granted") {
      perm = await PushNotifications.requestPermissions();
      await reportPushDiag("Checkpoint 2: Requested Push Permission Result", "INFO", perm);
    }

    report.permission = perm;
    if (perm.receive !== "granted") {
      const msg = `Push permission denied or not granted (status: ${perm.receive})`;
      await reportPushDiag("Checkpoint 2: Permission Error", "ERROR", msg);
      return { ...report, error: msg };
    }

    // Checkpoint 3: Register Token with Timeout Promise
    const tokenPromise = new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error("Timeout (10s) waiting for FCM registration token from Google Play Services."));
      }, 10000);

      PushNotifications.addListener("registration", (t) => {
        clearTimeout(timer);
        resolve(t.value);
      }).catch((e) => reject(e));

      PushNotifications.addListener("registrationError", (err) => {
        clearTimeout(timer);
        reject(new Error(err.error || "FCM registrationError received"));
      }).catch((e) => reject(e));

      PushNotifications.register().catch((regErr) => {
        clearTimeout(timer);
        reject(regErr);
      });
    });

    const token = await tokenPromise;
    report.token = token.slice(0, 16) + "..." + token.slice(-8);
    await reportPushDiag("Checkpoint 3: Push Token Received", "SUCCESS", {
      tokenPreview: report.token,
      tokenLength: token.length,
    });

    // Checkpoint 4: Sync to Backend
    const syncRes = await fetch("/api/users/device-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        deviceType: Capacitor.getPlatform(),
        deviceName: navigator.userAgent.slice(0, 100),
      }),
    });

    const syncJson = await syncRes.json();
    report.serverSync = { status: syncRes.status, ok: syncRes.ok, body: syncJson };

    if (!syncRes.ok) {
      await reportPushDiag("Checkpoint 4: Server Sync Failed", "ERROR", report.serverSync);
      return { ...report, error: `Backend returned ${syncRes.status}: ${syncJson?.error || "Unknown"}` };
    }

    await reportPushDiag("Checkpoint 4: Server Sync Success", "SUCCESS", report.serverSync);
    return report;
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    await reportPushDiag("Diagnostic Checkpoint Failure", "ERROR", errorMsg);
    return { ...report, error: errorMsg };
  }
}

/**
 * Initializes Native Mobile Capabilities automatically on app boot:
 * 1. Push Notifications (registration, token synchronization, background/foreground listeners)
 * 2. Capgo Over-The-Air (OTA) Live Updates
 */
export async function initializeNativeMobile() {
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();

  await reportPushDiag("App Boot: initializeNativeMobile called", "INFO", {
    isNative,
    platform,
    href: typeof window !== "undefined" ? window.location.href : "unknown",
  });

  if (!isNative) {
    return;
  }

  // 1. Initialize Capgo Over-The-Air (OTA) Updater
  try {
    await CapacitorUpdater.notifyAppReady();
    await reportPushDiag("Capgo OTA: notifyAppReady called", "INFO");
  } catch (otaErr: any) {
    await reportPushDiag("Capgo OTA: notifyAppReady warning", "WARNING", otaErr?.message);
  }

  // 2. Initialize Native Push Notifications
  try {
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive !== "granted") {
      permStatus = await PushNotifications.requestPermissions();
    }

    await reportPushDiag("Push Permission Status", "INFO", permStatus);

    if (permStatus.receive === "granted") {
      // Listen for registration events
      await PushNotifications.addListener("registration", async (token) => {
        await reportPushDiag("FCM registration event fired", "SUCCESS", {
          tokenPreview: token.value.slice(0, 16) + "...",
        });

        try {
          const res = await fetch("/api/users/device-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token: token.value,
              deviceType: Capacitor.getPlatform(),
              deviceName: navigator.userAgent.slice(0, 100),
            }),
          });
          const json = await res.json();
          await reportPushDiag("Token backend sync result", res.ok ? "SUCCESS" : "ERROR", {
            status: res.status,
            response: json,
          });
        } catch (syncErr: any) {
          await reportPushDiag("Token backend sync network error", "ERROR", syncErr?.message);
        }
      });

      await PushNotifications.addListener("registrationError", async (err) => {
        await reportPushDiag("FCM registrationError fired", "ERROR", err.error);
      });

      // Trigger native registration
      await PushNotifications.register().catch(async (err) => {
        await reportPushDiag("PushNotifications.register() call rejected", "ERROR", err?.message);
      });

      // Foreground notification listener
      await PushNotifications.addListener("pushNotificationReceived", (notification) => {
        console.log("[Native Push] Notification received in foreground:", notification);
      });

      // Action listener
      await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
        console.log("[Native Push] Action performed:", action);
        const data = action.notification.data;
        if (data?.url) {
          window.location.href = data.url;
        } else if (data?.taskId) {
          window.location.href = `/settings/tasks`;
        }
      });
    } else {
      await reportPushDiag("Push permission not granted", "WARNING", permStatus.receive);
    }
  } catch (pushErr: any) {
    await reportPushDiag("Push initialization unhandled error", "ERROR", pushErr?.message);
  }
}
