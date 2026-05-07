import * as React from "react";
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  Pressable,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { api, ApiError } from "@/lib/api";
import { useSession } from "@/lib/session-context";

interface ClipDetail {
  clip: {
    id: string;
    title: string;
    summary: string | null;
    kind: "highlight" | "reel" | "full";
    category: string | null;
    videoUrl: string;
    thumbnailUrl: string | null;
    durationSec: number | null;
    provider: "cloudinary" | "mux" | "bunny" | "external";
    publishedAt: string | null;
  };
  contestantId: string | null;
  contestantDisplay: string | null;
  episodeId: string | null;
  episodeTitle: string | null;
  engagement: { likes: number; myLiked: boolean; myWatchlisted: boolean };
}

export default function ClipDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();

  const [data, setData] = React.useState<ClipDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<"like" | "save" | null>(null);

  const player = useVideoPlayer(
    data?.clip.videoUrl ?? "",
    (p) => {
      p.loop = false;
      p.muted = false;
    }
  );

  const load = React.useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const r = await api.get<ClipDetail>(`/api/clips/${id}`);
      setData(r);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function toggleLike() {
    if (!user) {
      router.push("/sign-in");
      return;
    }
    if (!data) return;
    setBusy("like");
    try {
      const r = await api.post<{ liked: boolean; total: number }>(
        `/api/clips/${data.clip.id}/like`
      );
      setData({
        ...data,
        engagement: { ...data.engagement, myLiked: r.liked, likes: r.total },
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Like failed");
    } finally {
      setBusy(null);
    }
  }

  async function toggleSave() {
    if (!user) {
      router.push("/sign-in");
      return;
    }
    if (!data) return;
    setBusy("save");
    try {
      const r = await api.post<{ saved: boolean }>(
        `/api/clips/${data.clip.id}/watchlist`
      );
      setData({
        ...data,
        engagement: { ...data.engagement, myWatchlisted: r.saved },
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Save failed");
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color="#a1a1aa" />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-6">
        <Text className="text-muted-foreground text-center">
          {error ?? "Clip not found."}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="aspect-video bg-black">
        <VideoView
          player={player}
          style={{ flex: 1 }}
          allowsFullscreen
          allowsPictureInPicture
          contentFit="contain"
        />
      </View>

      <View className="p-5">
        <View className="flex-row gap-2 mb-2">
          <Tag>{data.clip.kind}</Tag>
          {data.clip.category && <Tag tone="muted">{data.clip.category}</Tag>}
        </View>

        <Text className="text-foreground text-2xl font-bold tracking-tight">
          {data.clip.title}
        </Text>

        {data.contestantDisplay && (
          <Text className="text-muted-foreground mt-1">
            {data.contestantDisplay}
            {data.episodeTitle ? ` · ${data.episodeTitle}` : ""}
          </Text>
        )}

        <View className="flex-row gap-3 mt-5">
          <ActionButton
            label={`${data.engagement.likes.toLocaleString()}`}
            icon={data.engagement.myLiked ? "❤" : "♡"}
            onPress={toggleLike}
            busy={busy === "like"}
            active={data.engagement.myLiked}
          />
          <ActionButton
            label={data.engagement.myWatchlisted ? "Saved" : "Save"}
            icon="🔖"
            onPress={toggleSave}
            busy={busy === "save"}
            active={data.engagement.myWatchlisted}
          />
        </View>

        {data.clip.summary && (
          <View className="mt-6 rounded-2xl border border-border bg-card p-4">
            <Text className="text-foreground text-sm">{data.clip.summary}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function Tag({
  children,
  tone = "primary",
}: {
  children: React.ReactNode;
  tone?: "primary" | "muted";
}) {
  return (
    <View
      className={`rounded-md px-2 py-0.5 ${
        tone === "primary" ? "bg-brand-500" : "bg-muted"
      }`}
    >
      <Text
        className={`text-[11px] font-semibold ${
          tone === "primary" ? "text-background" : "text-muted-foreground"
        }`}
      >
        {children}
      </Text>
    </View>
  );
}

function ActionButton({
  label,
  icon,
  onPress,
  busy,
  active,
}: {
  label: string;
  icon: string;
  onPress: () => void;
  busy: boolean;
  active: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      className={`flex-row items-center gap-2 rounded-xl px-4 h-11 ${
        active ? "bg-brand-500" : "border border-border bg-card"
      } active:opacity-80`}
    >
      <Text style={{ fontSize: 16 }}>{icon}</Text>
      <Text
        className={`text-sm font-semibold ${
          active ? "text-background" : "text-foreground"
        }`}
      >
        {busy ? "…" : label}
      </Text>
    </Pressable>
  );
}
