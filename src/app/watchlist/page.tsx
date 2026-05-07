"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, Play, Heart, Bookmark } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/auth/SessionProvider";
import { api, ApiError } from "@/lib/client-api";

interface WatchlistItem {
  id: string;
  title: string;
  summary: string | null;
  kind: "highlight" | "reel" | "full";
  category: string | null;
  thumbnailUrl: string | null;
  durationSec: number | null;
  contestantId: string | null;
  contestantDisplay: string | null;
  episodeId: string | null;
  episodeTitle: string | null;
  likes: number;
  createdAt: string;
}

function formatDuration(sec: number | null): string {
  if (!sec) return "";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function WatchlistPage() {
  const { user, loading: sessionLoading } = useSession();
  const [items, setItems] = React.useState<WatchlistItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.get<{ items: WatchlistItem[] }>(
        "/api/me/watchlist"
      );
      setItems(r.items);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!sessionLoading && user) void load();
  }, [load, sessionLoading, user]);

  async function remove(id: string) {
    setBusyId(id);
    try {
      await api.post(`/api/clips/${id}/watchlist`);
      setItems((xs) => xs.filter((x) => x.id !== id));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Remove failed");
    } finally {
      setBusyId(null);
    }
  }

  if (sessionLoading) {
    return (
      <div className="container py-20 text-center">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
      </div>
    );
  }
  if (!user) {
    return (
      <div className="container py-20 max-w-lg text-center">
        <Badge variant="outline" className="mb-3">Sign in needed</Badge>
        <p className="text-muted-foreground mt-2">
          Sign in to see the clips you saved.
        </p>
        <Button asChild variant="gradient" size="lg" className="mt-6">
          <Link href="/login?next=/watchlist">Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-12 md:py-16 max-w-5xl">
      <Badge variant="outline" className="mb-3">Watchlist</Badge>
      <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight">
        Saved <span className="gradient-text">for later</span>.
      </h1>
      <p className="mt-3 text-muted-foreground text-lg">
        Clips you bookmarked. Newest save first.
      </p>

      {error && (
        <p className="mt-6 rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {loading ? (
        <div className="text-center py-20">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-border/60 bg-card p-12 text-center">
          <p className="text-muted-foreground">
            You haven&apos;t saved any clips yet. Browse{" "}
            <Link href="/stage-performances" className="underline hover:text-foreground">
              stage performances
            </Link>{" "}
            and tap the bookmark icon to save.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((c) => (
            <div
              key={c.id}
              className="rounded-2xl border border-border/60 bg-card overflow-hidden"
            >
              <Link href={`/clips/${c.id}`} className="block">
                <div className="aspect-video bg-gradient-to-br from-brand-500/15 to-brand-700/15 relative flex items-center justify-center">
                  {c.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.thumbnailUrl}
                      alt={c.title}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <Play className="h-10 w-10 text-brand-500/70" />
                  )}
                  <Badge variant="default" className="absolute top-2 left-2 text-[10px]">
                    {c.kind}
                  </Badge>
                  {c.durationSec && (
                    <span className="absolute bottom-2 right-2 rounded-md bg-background/80 px-1.5 py-0.5 text-[10px] font-mono">
                      {formatDuration(c.durationSec)}
                    </span>
                  )}
                </div>
              </Link>
              <div className="p-4">
                <Link
                  href={`/clips/${c.id}`}
                  className="font-semibold truncate block hover:text-brand-500"
                >
                  {c.title}
                </Link>
                <p className="text-xs text-muted-foreground mt-1">
                  {c.contestantDisplay ?? "—"}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Heart className="h-3 w-3 text-rose-500" />
                    {c.likes.toLocaleString()}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busyId === c.id}
                    onClick={() => remove(c.id)}
                  >
                    <Bookmark className="h-3.5 w-3.5 mr-1.5 fill-current" />
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
