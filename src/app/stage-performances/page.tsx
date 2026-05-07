"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, Play, Heart, Search, Tv } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/client-api";
import { TALENT_CATEGORIES } from "@/data/categories";

interface ClipItem {
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

const KINDS: { value: "" | "highlight" | "reel" | "full"; label: string }[] = [
  { value: "", label: "All clips" },
  { value: "highlight", label: "Highlights" },
  { value: "reel", label: "Reels" },
  { value: "full", label: "Full performances" },
];

function formatDuration(sec: number | null): string {
  if (!sec) return "";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function StagePerformancesPage() {
  const [items, setItems] = React.useState<ClipItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [kind, setKind] = React.useState<"" | "highlight" | "reel" | "full">("");
  const [category, setCategory] = React.useState<string>("");
  const [q, setQ] = React.useState("");

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (kind) params.set("kind", kind);
        if (category) params.set("category", category);
        if (q.trim()) params.set("q", q.trim());
        params.set("limit", "120");
        const r = await api.get<{ items: ClipItem[] }>(
          `/api/clips?${params}`
        );
        setItems(r.items);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [kind, category, q]);

  return (
    <div className="container py-12 md:py-16 max-w-6xl">
      <Badge variant="outline" className="mb-3">Stage performances</Badge>
      <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight">
        Watch the <span className="gradient-text">moments</span>.
      </h1>
      <p className="mt-3 text-muted-foreground text-lg max-w-2xl">
        Highlights, reels, and full performances curated by the production
        team. Tap a clip to watch, save it to your watchlist, or jump into the
        Reels view.
      </p>

      <div className="mt-6 flex items-center gap-2">
        <Button asChild variant="gradient" size="sm">
          <Link href="/reels">
            <Tv className="h-4 w-4 mr-1.5" />
            Reels view
          </Link>
        </Button>
      </div>

      <div className="mt-6 grid sm:grid-cols-[1fr_180px_180px] gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search title or summary…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as typeof kind)}
          className="h-11 rounded-lg border border-input bg-background px-3 text-sm"
        >
          {KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-11 rounded-lg border border-input bg-background px-3 text-sm"
        >
          <option value="">All categories</option>
          {TALENT_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="mt-6 rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="mt-8">
        {loading ? (
          <div className="text-center py-20">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-border/60 bg-card p-12 text-center">
            <p className="text-muted-foreground">
              No clips match those filters. Try widening the search.
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((c) => (
              <Link
                key={c.id}
                href={`/clips/${c.id}`}
                className="rounded-2xl border border-border/60 bg-card overflow-hidden hover:border-brand-500/50 transition-colors block"
              >
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
                  <div className="absolute top-2 left-2 flex gap-2">
                    <Badge variant="default" className="text-[10px]">
                      {c.kind}
                    </Badge>
                    {c.category && (
                      <Badge variant="outline" className="text-[10px] bg-background/70">
                        {c.category}
                      </Badge>
                    )}
                  </div>
                  {c.durationSec && (
                    <span className="absolute bottom-2 right-2 rounded-md bg-background/80 px-1.5 py-0.5 text-[10px] font-mono">
                      {formatDuration(c.durationSec)}
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <p className="font-semibold truncate">{c.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {c.contestantDisplay ?? "—"}
                    {c.episodeTitle ? ` · ${c.episodeTitle}` : ""}
                  </p>
                  {c.summary && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                      {c.summary}
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Heart className="h-3 w-3 text-rose-500" />
                      {c.likes.toLocaleString()}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
