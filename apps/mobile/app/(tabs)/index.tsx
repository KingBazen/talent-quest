import * as React from "react";
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from "react-native";
import { api, ApiError } from "@/lib/api";
import { ClipCard, type ClipCardData } from "@/components/ClipCard";

/**
 * Home tab: latest published clips.
 *
 * Pull-to-refresh, no pagination yet (the API caps at 60 newest, which is
 * enough for the launch feed). When the founder grows this beyond a few
 * hundred clips we'll add cursor-based pagination — the API already
 * returns ordered-by-published_at-desc.
 */
export default function HomeTab() {
  const [items, setItems] = React.useState<ClipCardData[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setError(null);
    try {
      const r = await api.get<{ items: ClipCardData[] }>(
        "/api/clips?limit=60"
      );
      setItems(r.items);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load");
    }
  }, []);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <ScrollView
      className="flex-1 bg-background"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#a1a1aa" />
      }
    >
      <View className="px-4 pt-6 pb-4">
        <Text className="text-foreground text-3xl font-bold tracking-tight">
          The latest
        </Text>
        <Text className="text-muted-foreground mt-1">
          Highlights, reels, and full performances from the show.
        </Text>
      </View>

      {error && (
        <View className="mx-4 mb-4 rounded-lg border border-destructive bg-destructive/10 p-3">
          <Text className="text-destructive text-sm">{error}</Text>
        </View>
      )}

      <View className="px-4">
        {loading ? (
          <View className="py-20 items-center">
            <ActivityIndicator color="#a1a1aa" />
          </View>
        ) : items.length === 0 ? (
          <View className="py-20 items-center">
            <Text className="text-muted-foreground text-center">
              No clips published yet. Pull to refresh.
            </Text>
          </View>
        ) : (
          items.map((c) => <ClipCard key={c.id} clip={c} />)
        )}
      </View>
    </ScrollView>
  );
}
