"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, Heart, Bookmark, ChevronLeft, ChevronRight, Volume2, VolumeX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/client-api";
import { useSession } from "@/components/auth/SessionProvider";

interface Reel {
  id: string;
  title: string;
  summary: string | null;
  category: string | null;
  thumbnailUrl: string | null;
  contestantId: string | null;
  contestantDisplay: string | null;
  likes: number;
}

interface MyState {
  myLiked: boolean;
  myWatchlisted: boolean;
}

/**
 * Phase 11 (P11-T006): reels view.
 *
 * Vertical-card single-clip player with prev / next controls (buttons +
 * keyboard arrows). Starts muted because every browser blocks autoplay-
 * with-sound in 2026 — tap-to-unmute is explicit. Loads the per-clip detail
 * lazily so engagement state reflects who's watching.
 */
export default function ReelsPage() {
  const { user } = useSession();
  const [reels, setReels] = React.useState<Reel[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [idx, setIdx] = React.useState(0);
  const [muted, setMuted] = React.useState(true);
  const [busy, setBusy] = React.useState<"like" | "save" | null>(null);
  const [detail, setDetail] = React.useState<{
    videoUrl: string;
    state: MyState;
  } | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await api.get<{ items: Reel[] }>(
          "/api/clips?kind=reel&limit=60"
        );
        setReels(r.items);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Per-reel detail fetch — runs whenever the active reel changes so we have
  // the source URL + my-state for the current clip.
  const current = reels[idx];
  React.useEffect(() => {
    if (!current) return;
    setDetail(null);
    (async () => {
      try {
        const r = await api.get<{
          clip: { videoUrl: string };
          engagement: { myLiked: boolean; myWatchlisted: boolean };
        }>(`/api/clips/${current.id}`);
        setDetail({
          videoUrl: r.clip.videoUrl,
          state: {
            myLiked: r.engagement.myLiked,
            myWatchlisted: r.engagement.myWatchlisted,
          },
        });
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Failed to load reel");
      }
    })();
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard nav.
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === "j") {
        setIdx((i) => Math.min(i + 1, reels.length - 1));
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "k") {
        setIdx((i) => Math.max(i - 1, 0));
      }
      if (e.key === "m") {
        setMuted((m) => !m);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [reels.length]);

  async function toggleLike() {
    if (!user) {
      window.location.href = `/audience/register?next=/reels`;
      return;
    }
    if (!current) return;
    setBusy("like");
    try {
      const r = await api.post<{ liked: boolean; total: number }>(
        `/api/clips/${current.id}/like`
      );
      if (detail) setDetail({ ...detail, state: { ...detail.state, myLiked: r.liked } });
      setReels((rs) =>
        rs.map((rl) =>
          rl.id === current.id ? { ...rl, likes: r.total } : rl
        )
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Like failed");
    } finally {
      setBusy(null);
    }
  }

  async function toggleSave() {
    if (!user) {
      window.location.href = `/audience/register?next=/reels`;
      return;
    }
    if (!current) return;
    setBusy("save");
    try {
      const r = await api.post<{ saved: boolean }>(
        `/api/clips/${current.id}/watchlist`
      );
      if (detail)
        setDetail({
          ...detail,
          state: { ...detail.state, myWatchlisted: r.saved },
        });
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

  if (reels.length === 0) {
    return (
      <div className="container py-20 max-w-lg text-center">
        <Badge variant="outline" className="mb-3">Reels</Badge>
        <p className="text-muted-foreground">
          {error ?? "No reels published yet. Check back once the show is live."}
        </p>
        <Button asChild variant="ghost" size="sm" className="mt-4">
          <Link href="/stage-performances">All clips</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-8 md:py-12 max-w-md">
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
        <Badge variant="outline">Reels</Badge>
        <span>
          {idx + 1} / {reels.length}
        </span>
      </div>

      <div className="relative rounded-3xl overflow-hidden border border-border/60 bg-black aspect-[9/16]">
        {detail ? (
          <video
            key={detail.videoUrl}
            ref={videoRef}
            src={detail.videoUrl}
            poster={current.thumbnailUrl ?? undefined}
            autoPlay
            muted={muted}
            playsInline
            controls
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Side controls overlaid on the player */}
        <div className="absolute right-3 bottom-20 flex flex-col gap-2">
          <button
            onClick={() => setMuted((m) => !m)}
            className="h-10 w-10 rounded-full bg-background/70 backdrop-blur flex items-center justify-center"
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <button
            onClick={() => void toggleLike()}
            disabled={busy === "like"}
            className={`h-10 w-10 rounded-full backdrop-blur flex items-center justify-center ${
              detail?.state.myLiked
                ? "bg-rose-500/80"
                : "bg-background/70"
            }`}
            aria-label="Like"
          >
            <Heart
              className={`h-4 w-4 ${
                detail?.state.myLiked ? "fill-current text-white" : ""
              }`}
            />
          </button>
          <button
            onClick={() => void toggleSave()}
            disabled={busy === "save"}
            className={`h-10 w-10 rounded-full backdrop-blur flex items-center justify-center ${
              detail?.state.myWatchlisted
                ? "bg-brand-500/80"
                : "bg-background/70"
            }`}
            aria-label="Save"
          >
            <Bookmark
              className={`h-4 w-4 ${
                detail?.state.myWatchlisted ? "fill-current text-white" : ""
              }`}
            />
          </button>
        </div>

        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-white">
          <Link
            href={`/clips/${current.id}`}
            className="font-semibold text-base hover:underline"
          >
            {current.title}
          </Link>
          {current.contestantDisplay && (
            <p className="text-xs opacity-80 mt-0.5">
              {current.contestantDisplay}
              {current.category && ` · ${current.category}`}
            </p>
          )}
          <p className="text-[11px] opacity-60 mt-1">
            {current.likes.toLocaleString()} likes
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIdx((i) => Math.max(i - 1, 0))}
          disabled={idx === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-1.5" /> Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setIdx((i) => Math.min(i + 1, reels.length - 1))
          }
          disabled={idx >= reels.length - 1}
        >
          Next <ChevronRight className="h-4 w-4 ml-1.5" />
        </Button>
      </div>

      <p className="mt-3 text-[11px] text-muted-foreground text-center">
        Use ← → or J/K to navigate · M to mute · click the player to play
      </p>
    </div>
  );
}
