import * as React from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { api, ApiError } from "@/lib/api";
import { useSession } from "@/lib/session-context";

interface ProfileData {
  contestant: {
    id: string;
    displayName: string;
    city: string;
    category: string;
    status: string;
    bio: string;
    experience: string;
  };
  submission: {
    id: string;
    title: string;
    videoUrl: string;
    thumbnailUrl: string | null;
    durationSec: number | null;
  } | null;
  engagement: {
    likes: number;
    followers: number;
    myLiked: boolean;
    myFollowing: boolean;
    votes: number;
    myVoted: boolean;
    votingOpen: boolean;
    round: number;
  };
  comments: {
    id: string;
    authorDisplay: string;
    authorRole: string;
    body: string;
    flagCount: number;
    status: string;
    createdAt: string;
  }[];
}

export default function PublicContestantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();

  const [data, setData] = React.useState<ProfileData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<"like" | "follow" | "vote" | null>(null);

  const player = useVideoPlayer(data?.submission?.videoUrl ?? "", (p) => {
    p.loop = false;
    p.muted = false;
  });

  const load = React.useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const r = await api.get<ProfileData>(`/api/contestants/${id}/profile`);
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
        `/api/contestants/${data.contestant.id}/like`
      );
      setData({
        ...data,
        engagement: {
          ...data.engagement,
          myLiked: r.liked,
          likes: r.total,
        },
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Like failed");
    } finally {
      setBusy(null);
    }
  }

  async function toggleFollow() {
    if (!user) {
      router.push("/sign-in");
      return;
    }
    if (!data) return;
    setBusy("follow");
    try {
      const r = await api.post<{ following: boolean; total: number }>(
        `/api/contestants/${data.contestant.id}/follow`
      );
      setData({
        ...data,
        engagement: {
          ...data.engagement,
          myFollowing: r.following,
          followers: r.total,
        },
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Follow failed");
    } finally {
      setBusy(null);
    }
  }

  async function castVote() {
    if (!user) {
      router.push("/sign-in");
      return;
    }
    if (!data) return;
    setBusy("vote");
    try {
      const r = await api.post<{ total: number }>(
        `/api/contestants/${data.contestant.id}/vote`
      );
      setData({
        ...data,
        engagement: { ...data.engagement, myVoted: true, votes: r.total },
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Vote failed");
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
          {error ?? "Contestant not found."}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="p-5">
        <View className="flex-row items-center gap-4">
          <View className="h-16 w-16 rounded-full bg-brand-500 items-center justify-center">
            <Text className="text-background font-bold text-2xl">
              {data.contestant.displayName[0]}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-foreground text-2xl font-bold tracking-tight">
              {data.contestant.displayName}
            </Text>
            <Text className="text-muted-foreground text-xs mt-0.5">
              {data.contestant.city} · {data.contestant.category} · {data.contestant.status}
            </Text>
          </View>
        </View>

        <View className="flex-row gap-2 mt-5 flex-wrap">
          <Action
            label={data.engagement.likes.toLocaleString()}
            icon={data.engagement.myLiked ? "❤" : "♡"}
            onPress={toggleLike}
            active={data.engagement.myLiked}
            busy={busy === "like"}
          />
          <Action
            label={`${data.engagement.myFollowing ? "Following" : "Follow"} · ${data.engagement.followers.toLocaleString()}`}
            icon="👥"
            onPress={toggleFollow}
            active={data.engagement.myFollowing}
            busy={busy === "follow"}
          />
          {data.engagement.votingOpen && (
            <Action
              label={`${data.engagement.myVoted ? "Voted" : "Vote"} · ${data.engagement.votes.toLocaleString()}`}
              icon="✓"
              onPress={castVote}
              active={data.engagement.myVoted}
              busy={busy === "vote"}
              disabled={data.engagement.myVoted}
            />
          )}
        </View>
      </View>

      {data.submission && (
        <View className="bg-black aspect-video">
          <VideoView
            player={player}
            style={{ flex: 1 }}
            allowsFullscreen
            allowsPictureInPicture
            contentFit="contain"
          />
        </View>
      )}

      {(data.contestant.bio || data.contestant.experience) && (
        <View className="m-5 rounded-2xl border border-border bg-card p-4">
          {data.contestant.bio && (
            <Text className="text-foreground text-sm">{data.contestant.bio}</Text>
          )}
          {data.contestant.experience && (
            <Text className="text-muted-foreground text-xs mt-3">
              Experience: {data.contestant.experience}
            </Text>
          )}
        </View>
      )}

      {data.comments.length > 0 && (
        <View className="px-5 pb-10">
          <Text className="text-foreground font-semibold mb-3">
            Comments ({data.comments.length})
          </Text>
          {data.comments.slice(0, 20).map((c) => (
            <View
              key={c.id}
              className="rounded-xl border border-border bg-card p-3 mb-2"
            >
              <View className="flex-row items-center gap-2 mb-1">
                <Text className="text-foreground font-semibold text-sm">
                  {c.authorDisplay}
                </Text>
                {c.authorRole !== "audience" && (
                  <Text className="text-[10px] text-muted-foreground border border-border rounded px-1">
                    {c.authorRole}
                  </Text>
                )}
              </View>
              <Text className="text-foreground text-sm">{c.body}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function Action({
  label,
  icon,
  onPress,
  active,
  busy,
  disabled,
}: {
  label: string;
  icon: string;
  onPress: () => void;
  active: boolean;
  busy: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy || disabled}
      className={`flex-row items-center gap-2 rounded-xl px-3 h-10 ${
        active ? "bg-brand-500" : "border border-border bg-card"
      } ${busy || disabled ? "opacity-60" : "active:opacity-80"}`}
    >
      <Text style={{ fontSize: 14 }}>{icon}</Text>
      <Text
        className={`text-xs font-semibold ${
          active ? "text-background" : "text-foreground"
        }`}
      >
        {busy ? "…" : label}
      </Text>
    </Pressable>
  );
}
