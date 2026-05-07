import "../global.css";
import * as React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SessionProvider, useSession } from "@/lib/session-context";
import { registerForPushNotifications } from "@/lib/push-notifications";

/**
 * Root layout. Wraps every screen with the session + safe-area providers.
 * Keep this lean — anything heavier (theming, analytics, error boundary)
 * goes in dedicated providers, not inline here.
 */

function PushBootstrap() {
  const { user } = useSession();
  React.useEffect(() => {
    if (!user) return;
    // Fire-and-forget. The backend push-token endpoint is a follow-up
    // (see lib/push-notifications.ts header). Until then this just gets
    // permission + an Expo token in dev so we can verify the prompt UX.
    void registerForPushNotifications();
  }, [user]);
  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <PushBootstrap />
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: "#0b0b0d" },
            headerTintColor: "#f5f5f7",
            contentStyle: { backgroundColor: "#0b0b0d" },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="sign-in"
            options={{ title: "Sign in", presentation: "modal" }}
          />
          <Stack.Screen
            name="clips/[id]"
            options={{ title: "Clip", headerBackTitle: "Back" }}
          />
          <Stack.Screen
            name="contestants/[id]"
            options={{ title: "Contestant" }}
          />
        </Stack>
      </SessionProvider>
    </SafeAreaProvider>
  );
}
