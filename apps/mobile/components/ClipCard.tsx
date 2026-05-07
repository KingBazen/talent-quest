import { View, Text, Image, Pressable } from "react-native";
import { router } from "expo-router";

export interface ClipCardData {
  id: string;
  title: string;
  summary: string | null;
  kind: "highlight" | "reel" | "full";
  category: string | null;
  thumbnailUrl: string | null;
  durationSec: number | null;
  contestantDisplay: string | null;
  episodeTitle: string | null;
  likes: number;
}

function formatDuration(sec: number | null): string {
  if (!sec) return "";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ClipCard({ clip }: { clip: ClipCardData }) {
  return (
    <Pressable
      onPress={() => router.push(`/clips/${clip.id}`)}
      className="rounded-2xl border border-border bg-card overflow-hidden mb-3 active:opacity-80"
    >
      <View className="aspect-video bg-muted">
        {clip.thumbnailUrl ? (
          <Image
            source={{ uri: clip.thumbnailUrl }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Text style={{ fontSize: 32 }}>▶</Text>
          </View>
        )}
        <View className="absolute top-2 left-2 flex-row gap-1.5">
          <Badge>{clip.kind}</Badge>
          {clip.category && <Badge tone="muted">{clip.category}</Badge>}
        </View>
        {clip.durationSec && (
          <View className="absolute bottom-2 right-2 rounded bg-background/80 px-1.5 py-0.5">
            <Text className="text-foreground text-[10px]" style={{ fontFamily: "monospace" }}>
              {formatDuration(clip.durationSec)}
            </Text>
          </View>
        )}
      </View>
      <View className="p-3">
        <Text className="font-semibold text-foreground" numberOfLines={1}>
          {clip.title}
        </Text>
        <Text className="text-xs text-muted-foreground mt-0.5">
          {clip.contestantDisplay ?? "—"}
          {clip.episodeTitle ? ` · ${clip.episodeTitle}` : ""}
        </Text>
        <View className="flex-row items-center gap-3 mt-2">
          <Text className="text-xs text-muted-foreground">
            ❤ {clip.likes.toLocaleString()}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function Badge({
  children,
  tone = "primary",
}: {
  children: React.ReactNode;
  tone?: "primary" | "muted";
}) {
  return (
    <View
      className={`rounded-md px-1.5 py-0.5 ${
        tone === "primary" ? "bg-brand-500" : "bg-background/70"
      }`}
    >
      <Text
        className={`text-[10px] font-semibold ${
          tone === "primary" ? "text-background" : "text-foreground"
        }`}
      >
        {children}
      </Text>
    </View>
  );
}
