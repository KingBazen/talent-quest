import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";

/**
 * Phase 12 (P12-T009): push notification scaffold.
 *
 * What this does today:
 *   1. Sets the foreground notification handler so a notification arriving
 *      while the app is open shows the alert + bumps the badge.
 *   2. Asks the user for permission (idempotent — does nothing on a re-call).
 *   3. Registers an Expo push token. Returns the token so the caller can
 *      POST it to the backend.
 *
 * What this DOES NOT do (deferred to production wiring):
 *   - The backend route to receive + store push tokens. That's a one-table
 *     migration plus a POST /api/me/push-token endpoint — small follow-up.
 *   - Calling Expo's push API to actually send notifications. Once the
 *     backend has tokens, the existing `notify.ts` helpers gain a
 *     `sendPush()` companion.
 *   - APNs / FCM credentials. Those are an EAS Build / Firebase Console
 *     task that the founder does once, then `expo-notifications` handles
 *     delivery.
 *
 * Today this is wired but inert — the registration round-trip works against
 * Expo's notification service, but no message is sent until the backend
 * push pipeline lands.
 */

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface RegistrationResult {
  granted: boolean;
  token: string | null;
}

export async function registerForPushNotifications(): Promise<RegistrationResult> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: "#f0c674",
    });
  }

  if (!Device.isDevice) {
    // Push notifications don't work on simulators / emulators.
    return { granted: false, token: null };
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== "granted") {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== "granted") {
    return { granted: false, token: null };
  }

  try {
    // EAS sets the project ID at build time; in dev it's read from
    // app.json's extra.eas.projectId or omitted (Expo's dev push works
    // without it).
    const result = await Notifications.getExpoPushTokenAsync();
    return { granted: true, token: result.data };
  } catch {
    return { granted: true, token: null };
  }
}
