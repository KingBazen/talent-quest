"use client";

import * as React from "react";
import {
  Star,
  Play,
  Send,
  Sparkles,
  Loader2,
  Volume2,
  Maximize2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { JUDGING_CRITERIA } from "@/data/judging";
import { TALENT_CATEGORIES } from "@/data/categories";
import { useSession } from "@/components/auth/SessionProvider";
import { api, ApiError } from "@/lib/client-api";
import { cn } from "@/lib/utils";

interface QueueItem {
  id: string;
  contestantId: string;
  title: string;
  contestant: string;
  city: string;
  category: string;
  thumbnail: string | null;
  videoUrl: string | null;
  durationSec: number | null;
  reviewedByMe: boolean;
}

export default function RefereePage() {
  const { user, loading: sessionLoading } = useSession();
  const [queue, setQueue] = React.useState<QueueItem[]>([]);
  const [active, setActive] = React.useState(0);
  const [scores, setScores] = React.useState<Record<string, number>>(() =>
    Object.fromEntries(JUDGING_CRITERIA.map((c) => [c.key, 0]))
  );
  const [notes, setNotes] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [loaded, setLoaded] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const d = await api.get<{ items: QueueItem[] }>("/api/referee/queue");
      setQueue(d.items);
      // Snap to first un-reviewed item
      const idx = d.items.findIndex((i) => !i.reviewedByMe);
      setActive(idx === -1 ? 0 : idx);
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : "Failed to load");
    } finally {
      setLoaded(true);
    }
  }, []);

  React.useEffect(() => {
    if (!sessionLoading && (user?.role === "referee" || user?.role === "admin")) {
      void load();
    }
  }, [sessionLoading, user, load]);

  if (sessionLoading || !loaded) {
    return (
      <div className="container py-20 text-center">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <div className="container py-20 max-w-xl text-center">
        <Badge variant="outline" className="mb-3">Referee dashboard</Badge>
        <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
          Queue is empty.
        </h1>
        <p className="mt-3 text-muted-foreground">
          No submissions to review right now. Once contestants upload videos,
          they appear here for scoring.
        </p>
        <Button variant="outline" className="mt-6" onClick={() => void load()}>
          Refresh
        </Button>
      </div>
    );
  }

  const clip = queue[active];
  const cat = TALENT_CATEGORIES.find((c) => c.id === clip.category);
  const total = JUDGING_CRITERIA.reduce((s, c) => s + (scores[c.key] || 0), 0);

  function setScore(key: string, val: number, max: number) {
    setScores((p) => ({
      ...p,
      [key]: Math.max(0, Math.min(max, Math.round(val))),
    }));
  }

  async function submit() {
    setServerError(null);
    setBusy(true);
    try {
      await api.post("/api/scores", {
        submissionId: clip.id,
        scores,
        notes,
      });
      // Mark reviewed locally + advance.
      setQueue((q) =>
        q.map((c, i) => (i === active ? { ...c, reviewedByMe: true } : c))
      );
      const nextIdx = queue.findIndex(
        (i, idx) => idx !== active && !i.reviewedByMe
      );
      if (nextIdx !== -1) setActive(nextIdx);
      setScores(Object.fromEntries(JUDGING_CRITERIA.map((c) => [c.key, 0])));
      setNotes("");
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : "Score save failed");
    } finally {
      setBusy(false);
    }
  }

  const reviewedCount = queue.filter((i) => i.reviewedByMe).length;

  return (
    <div className="container py-10 md:py-14 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Badge variant="outline" className="mb-2">Referee dashboard</Badge>
          <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
            Score every act on a <span className="gradient-text">100-point</span> rubric.
          </h1>
        </div>
        <Badge variant="gradient">
          <Sparkles className="h-3 w-3 mr-1" />
          {reviewedCount} of {queue.length} reviewed
        </Badge>
      </div>

      <div className="grid lg:grid-cols-[1fr_380px] gap-6">
        <div className="rounded-3xl overflow-hidden border border-border/60 bg-card">
          <div
            className="relative aspect-video bg-cover bg-center bg-muted"
            style={
              clip.thumbnail
                ? { backgroundImage: `url(${clip.thumbnail})` }
                : undefined
            }
          >
            <div className="absolute inset-0 bg-black/40" />
            <div className="absolute inset-0 flex items-center justify-center">
              {clip.videoUrl ? (
                <a
                  href={clip.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-white/90 text-black hover:scale-105 transition"
                >
                  <Play className="h-7 w-7 fill-current" />
                </a>
              ) : (
                <div className="text-white/80 text-sm">Video URL pending</div>
              )}
            </div>
            <div className="absolute top-3 left-3 flex gap-2">
              <Badge variant="gradient" className="capitalize">
                {cat?.emoji} {cat?.name || clip.category}
              </Badge>
              <Badge variant="secondary" className="font-mono">
                ID {clip.contestantId}
              </Badge>
            </div>
            <div className="absolute bottom-3 right-3 flex gap-2">
              <button className="rounded-full bg-black/60 p-2 text-white">
                <Volume2 className="h-4 w-4" />
              </button>
              <button className="rounded-full bg-black/60 p-2 text-white">
                <Maximize2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="p-5 border-t border-border/60">
            <h2 className="font-display text-2xl font-bold">{clip.title}</h2>
            <p className="text-sm text-muted-foreground">
              {clip.contestant} · {clip.city}
              {clip.durationSec
                ? ` · ${Math.floor(clip.durationSec / 60)}:${String(
                    clip.durationSec % 60
                  ).padStart(2, "0")}`
                : ""}
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-border/60 bg-card p-5 space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <p className="font-semibold">Your score</p>
              <span className="font-display text-2xl font-bold gradient-text">
                {total} / 100
              </span>
            </div>
            <Progress value={total} className="mt-2" />
          </div>

          <div className="space-y-3">
            {JUDGING_CRITERIA.map((c) => (
              <div key={c.key}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{c.label}</span>
                  <span className="text-muted-foreground">
                    {scores[c.key] || 0} / {c.weight}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {c.description}
                </p>
                <input
                  type="range"
                  min={0}
                  max={c.weight}
                  value={scores[c.key] || 0}
                  onChange={(e) => setScore(c.key, Number(e.target.value), c.weight)}
                  className="mt-2 w-full accent-brand-500"
                />
                <div className="mt-2 flex gap-1.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setScore(c.key, ((i + 1) / 5) * c.weight, c.weight)}
                      className={cn(
                        "rounded-md p-1 transition",
                        (scores[c.key] || 0) >= ((i + 1) / 5) * c.weight
                          ? "text-gold-500"
                          : "text-muted-foreground"
                      )}
                      aria-label={`${i + 1} stars`}
                    >
                      <Star
                        className={cn(
                          "h-4 w-4",
                          (scores[c.key] || 0) >= ((i + 1) / 5) * c.weight && "fill-gold-500"
                        )}
                      />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div>
            <p className="text-sm font-medium mb-1.5">Private notes</p>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Strong stage presence; tighten the pre-chorus."
            />
          </div>

          {serverError && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              {serverError}
            </p>
          )}

          <Button
            onClick={submit}
            variant="gradient"
            size="lg"
            disabled={busy}
            className="w-full"
          >
            {busy ? "Saving…" : clip.reviewedByMe ? "Update score" : "Submit score"}
            <Send className="ml-2 h-4 w-4" />
          </Button>
          <p className="text-[11px] text-muted-foreground text-center">
            Scores are persisted to the database and aggregated across all
            referees in real time.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-4">
        <p className="font-semibold text-sm mb-3">Review queue ({queue.length})</p>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
          {queue.map((q, i) => (
            <button
              key={q.id}
              onClick={() => setActive(i)}
              className={cn(
                "shrink-0 w-44 rounded-xl border p-2 text-left transition",
                active === i ? "border-brand-500" : "border-border/60 hover:bg-muted"
              )}
            >
              <div
                className="aspect-video rounded-md bg-muted bg-cover bg-center"
                style={
                  q.thumbnail ? { backgroundImage: `url(${q.thumbnail})` } : undefined
                }
              />
              <p className="mt-2 text-xs font-medium line-clamp-1">{q.title}</p>
              <p className="text-[10px] text-muted-foreground">{q.contestant}</p>
              {q.reviewedByMe && (
                <Badge variant="gradient" className="mt-1.5 text-[10px]">
                  Reviewed
                </Badge>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
