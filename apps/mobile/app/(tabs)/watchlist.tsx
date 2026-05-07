import * as React from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Pressable,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { api, ApiError } from "@/lib/api";
import { useSession } from "@/lib/session-context";
import { ClipCard, type ClipCardData } from "@/components/ClipCard";

export default function WatchlistTab() {
  const { user, loading: sessionLoading } = useSession();
  const [items, setItems] = React.useState<ClipCardData[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!user) return;
    setError(null);
    try {
      const r = await api.get<{ items: ClipCardData[] }>(
        "/api/me/watchlist"
      );
      setItems(r.items);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load");
    }
  }, [user]);

  React.useEffect(() => {
    if (sessionLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load, sessionLoading, user]);

  if (sessionLoading) {
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
          Sign in to save clips
        </Text>
        <Text className="text-muted-foreground text-center mt-2">
          Bookmark clips you want to come back to.
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

  return (
    <ScrollView
      className="flex-1 bg-background"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }}
          tintColor="#a1a1aa"
        />
      }
    >
      <View className="px-4 pt-6 pb-4">
        <Text className="text-foreground text-3xl font-bold tracking-tight">
          Watchlist
        </Text>
        <Text className="text-muted-foreground mt-1">
          Saved clips. Newest first.
        </Text>
      </View>

      {error && (
        <View className="mx-4 mb-4 rounded-lg border border-destructive bg-destructive/10 p-3">
          <Text className="text-destructive text-sm">{error}</Text>
        </View>
      )}

      <View className="px-4 pb-6">
        {loading ? (
          <View className="py-20 items-center">
            <ActivityIndicator color="#a1a1aa" />
          </View>
        ) : items.length === 0 ? (
          <View className="py-20 items-center">
            <Text className="text-muted-foreground text-center">
              No saved clips yet. Bookmark clips from the home tab.
            </Text>
          </View>
        ) : (
          items.map((c) => <ClipCard key={c.id} clip={c} />)
        )}
      </View>
    </ScrollView>
  );
}
