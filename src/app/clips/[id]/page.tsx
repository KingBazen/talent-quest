"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2, Heart, Bookmark } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/client-api";
import { useSession } from "@/components/auth/SessionProvider";

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

export default function PublicClipPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { user } = useSession();
  const [data, setData] = React.useState<ClipDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<"like" | "save" | null>(null);

  const load = React.useCallback(async () => {
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
      window.location.href = `/audience/register?next=/clips/${id}`;
      return;
    }
    setBusy("like");
    try {
      const r = await api.post<{ liked: boolean; total: number }>(
        `/api/clips/${id}/like`
      );
      if (data) {
        setData({
          ...data,
          engagement: {
            ...data.engagement,
            myLiked: r.liked,
            likes: r.total,
          },
        });
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Like failed");
    } finally {
      setBusy(null);
    }
  }

  async function toggleSave() {
    if (!user) {
      window.location.href = `/audience/register?next=/clips/${id}`;
      return;
    }
    setBusy("save");
    try {
      const r = await api.post<{ saved: boolean }>(
        `/api/clips/${id}/watchlist`
      );
      if (data) {
        setData({
          ...data,
          engagement: { ...data.engagement, myWatchlisted: r.saved },
        });
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Save failed");
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="container py-20 text-center">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="container py-20 max-w-lg text-center">
        <Badge variant="outline" className="mb-3">Clip</Badge>
        <p className="text-muted-foreground">{error ?? "Not found"}</p>
        <Button asChild variant="ghost" size="sm" className="mt-4">
          <Link href="/stage-performances">Back to clips</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-10 md:py-14 max-w-3xl">
      <Link
        href="/stage-performances"
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        ← all clips
      </Link>

      <div className="mt-4 flex items-center gap-2 text-sm">
        <Badge>{data.clip.kind}</Badge>
        {data.clip.category && (
          <Badge variant="outline" className="text-[10px]">
            {data.clip.category}
          </Badge>
        )}
        <span className="text-xs text-muted-foreground">
          provider: {data.clip.provider}
        </span>
      </div>

      <h1 className="mt-3 font-display text-3xl md:text-5xl font-bold tracking-tight">
        {data.clip.title}
      </h1>
      {data.contestantDisplay && (
        <p className="mt-2 text-sm">
          <Link
            href={`/contestants/${data.contestantId}`}
            className="hover:text-brand-500"
          >
            {data.contestantDisplay}
          </Link>
          {data.episodeTitle && (
            <>
              {" · "}
              <Link
                href={`/episodes/${data.episodeId}`}
                className="text-muted-foreground hover:text-foreground"
              >
                {data.episodeTitle}
              </Link>
            </>
          )}
        </p>
      )}

      <div className="mt-6 rounded-2xl border border-border/60 bg-card overflow-hidden">
        <video
          controls
          preload="metadata"
          poster={data.clip.thumbnailUrl ?? undefined}
          className="w-full bg-black"
          src={data.clip.videoUrl}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          variant={data.engagement.myLiked ? "gradient" : "outline"}
          size="sm"
          onClick={() => void toggleLike()}
          disabled={busy === "like"}
        >
          <Heart
            className={`h-4 w-4 mr-1.5 ${
              data.engagement.myLiked ? "fill-current" : ""
            }`}
          />
          {data.engagement.likes.toLocaleString()}
        </Button>
        <Button
          variant={data.engagement.myWatchlisted ? "gradient" : "outline"}
          size="sm"
          onClick={() => void toggleSave()}
          disabled={busy === "save"}
          title={
            data.engagement.myWatchlisted
              ? "Saved to your watchlist"
              : "Save for later"
          }
        >
          <Bookmark
            className={`h-4 w-4 mr-1.5 ${
              data.engagement.myWatchlisted ? "fill-current" : ""
            }`}
          />
          {data.engagement.myWatchlisted ? "Saved" : "Save"}
        </Button>
      </div>

      {data.clip.summary && (
        <div className="mt-8 rounded-2xl border border-border/60 bg-card p-5 text-sm">
          {data.clip.summary}
        </div>
      )}
    </div>
  );
}
