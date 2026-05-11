import * as React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router } from "expo-router";
import Constants from "expo-constants";
import { useSession } from "@/lib/session-context";
import { signOut } from "@/lib/auth";

export default function ProfileTab() {
  const { user, loading, refresh } = useSession();
  const [busy, setBusy] = React.useState(false);

  async function doSignOut() {
    Alert.alert("Sign out?", "You'll need to sign in again to vote, save clips, or comment.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          await signOut();
          await refresh();
          setBusy(false);
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color="#a1a1aa" />
      </View>
    );
  }

  if (!user) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-8">
        <Text className="text-foreground text-2xl font-bold tracking-tight text-center">
          Sign in
        </Text>
        <Text className="text-muted-foreground text-center mt-2">
          Create a free fan account to like, follow, vote, and save clips.
        </Text>
        <Pressable
          onPress={() => router.push("/sign-in")}
          className="mt-6 h-11 rounded-xl bg-brand-500 px-6 items-center justify-center active:opacity-80"
        >
          <Text className="text-background font-semibold">Sign in</Text>
        </Pressable>
      </View>
    );
  }

  const release =
    process.env.EXPO_PUBLIC_RELEASE_TAG ??
    Constants.expoConfig?.version ??
    "dev";

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="p-6">
        <View className="flex-row items-center gap-4">
          <View className="h-16 w-16 rounded-full bg-brand-500 items-center justify-center">
            <Text className="text-background font-bold text-2xl">
              {user.fullName.split(" ").map((p) => p[0]).slice(0, 2).join("")}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-foreground text-xl font-semibold">
              {user.fullName}
            </Text>
            <Text className="text-muted-foreground text-xs">{user.email}</Text>
            <Text className="text-muted-foreground text-[10px] mt-1 uppercase tracking-wider">
              {user.role}
            </Text>
          </View>
        </View>

        <View className="mt-8 gap-3">
          <Pressable
            onPress={doSignOut}
            disabled={busy}
            className="h-11 rounded-xl border border-destructive items-center justify-center active:opacity-80"
          >
            <Text className="text-destructive font-semibold">
              {busy ? "Signing out…" : "Sign out"}
            </Text>
          </Pressable>
        </View>

        <View className="mt-12">
          <Text className="text-muted-foreground text-[10px] text-center">
            The Bling Records Talent Show · v{release}
          </Text>
          <Text className="text-muted-foreground text-[10px] text-center mt-1">
            Bling Records × Neo Studios
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
