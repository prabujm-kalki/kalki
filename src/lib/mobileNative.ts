import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { CapacitorUpdater } from "@capgo/capacitor-updater";

/**
 * Initializes Native Mobile Capabilities:
 * 1. Push Notifications (registration, token synchronization, background/foreground listeners)
 * 2. Capgo Over-The-Air (OTA) Live Updates
 */
export async function initializeNativeMobile() {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  // 1. Initialize Capgo Over-The-Air (OTA) Updater
  try {
    // Notify native updater that web view loaded successfully
    await CapacitorUpdater.notifyAppReady();
    console.log("[Native Mobile] Capgo OTA App Ready notified.");
  } catch (otaErr) {
    console.warn("[Native Mobile] Capgo OTA notifyAppReady warning:", otaErr);
  }

  // 2. Initialize Native Push Notifications
  try {
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive !== "granted") {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive === "granted") {
      // Create a promise to wait for token registration so that page navigation does not cancel it
      const registerPromise = new Promise<void>((resolve) => {
        PushNotifications.addListener("registration", async (token) => {
          console.log("[Native Push] Registered with token:", token.value);
          try {
            await fetch("/api/users/device-token", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                token: token.value,
                deviceType: Capacitor.getPlatform(),
                deviceName: navigator.userAgent.slice(0, 100),
              }),
            });
            console.log("[Native Push] Token successfully sent to server.");
          } catch (syncErr) {
            console.error("[Native Push] Failed to sync token with backend:", syncErr);
          } finally {
            resolve();
          }
        });

        PushNotifications.addListener("registrationError", (err) => {
          console.error("[Native Push] Registration error:", err.error);
          resolve();
        });

        // Trigger native registration
        PushNotifications.register().catch((err) => {
          console.error("[Native Push] register() failed:", err);
          resolve();
        });

        // Timeout fallback after 4 seconds
        setTimeout(resolve, 4000);
      });

      await registerPromise;

      // When push notification is received while app is open
      await PushNotifications.addListener("pushNotificationReceived", (notification) => {
        console.log("[Native Push] Notification received in foreground:", notification);
      });

      // When user clicks / taps on a push notification
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
      console.warn("[Native Push] Permission not granted:", permStatus.receive);
    }
  } catch (pushErr) {
    console.error("[Native Push] Initialization error:", pushErr);
  }
}
