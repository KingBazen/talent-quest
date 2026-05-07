import * as React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { api, ApiError } from "@/lib/api";

interface Contestant {
  id: string;
  displayName: string;
  city: string;
  category: string;
  status: string;
  likes: number;
  followers: number;
}

export default function ContestantsTab() {
  const [items, setItems] = React.useState<Contestant[]>([]);
  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      const r = await api.get<{ items: Contestant[] }>(
        `/api/contestants?${params}`
      );
      setItems(r.items);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load");
    }
  }, [q]);

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
          Contestants
        </Text>
        <Text className="text-muted-foreground mt-1">
          Cheer them on. Like, follow, comment.
        </Text>

        <View className="mt-5">
          <TextInput
            className="h-12 rounded-xl border border-border bg-card px-4 text-foreground"
            placeholderTextColor="#a1a1aa"
            placeholder="Search stage name…"
            value={q}
            onChangeText={setQ}
            autoCapitalize="none"
            returnKeyType="search"
          />
        </View>
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
              No contestants match.
            </Text>
          </View>
        ) : (
          items.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => router.push(`/contestants/${c.id}`)}
              className="rounded-2xl border border-border bg-card p-4 mb-3 flex-row items-center gap-4 active:opacity-80"
            >
              <View className="h-12 w-12 rounded-full bg-brand-500 items-center justify-center">
                <Text className="text-background font-bold text-base">
                  {c.displayName[0]}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-foreground">
                  {c.displayName}
                </Text>
                <Text className="text-xs text-muted-foreground">
                  {c.city} · {c.category}
                </Text>
                <View className="flex-row gap-3 mt-1">
                  <Text className="text-xs text-muted-foreground">
                    ❤ {c.likes.toLocaleString()}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    👥 {c.followers.toLocaleString()}
                  </Text>
                </View>
              </View>
            </Pressable>
          ))
        )}
      </View>
    </ScrollView>
  );
}
