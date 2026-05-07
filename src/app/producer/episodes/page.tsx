"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, Plus, Film, CalendarClock, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/components/auth/SessionProvider";
import { ProducerSubNav } from "@/components/producer/SubNav";
import { api, ApiError } from "@/lib/client-api";

interface Season {
  id: string;
  number: number;
  title: string;
  status: "draft" | "active" | "closed";
}

interface Episode {
  id: string;
  season_id: string;
  number: number;
  title: string;
  summary: string | null;
  scheduled_for: string | null;
  status: "draft" | "scheduled" | "aired" | "archived";
  aired_at: string | null;
}

function ProducerEpisodesInner() {
  const { user, loading: sessionLoading } = useSession();
  const params = useSearchParams();
  const initialSeason = params.get("seasonId") ?? "";

  const [seasons, setSeasons] = React.useState<Season[]>([]);
  const [seasonId, setSeasonId] = React.useState<string>(initialSeason);
  const [episodes, setEpisodes] = React.useState<Episode[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [draft, setDraft] = React.useState({
    number: 1,
    title: "",
    summary: "",
    scheduledFor: "",
  });

  const allowed = user?.role === "producer" || user?.role === "admin";

  const loadSeasons = React.useCallback(async () => {
    const r = await api.get<{ items: Season[] }>("/api/producer/seasons");
    setSeasons(r.items);
    if (!seasonId && r.items[0]) setSeasonId(r.items[0].id);
  }, [seasonId]);

  const loadEpisodes = React.useCallback(async () => {
    if (!seasonId) {
      setEpisodes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await api.get<{ items: Episode[] }>(
        `/api/producer/episodes?seasonId=${seasonId}`
      );
      setEpisodes(r.items);
      const next = (r.items.at(-1)?.number ?? 0) + 1;
      setDraft((d) => ({ ...d, number: Math.max(next, 1) }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [seasonId]);

  React.useEffect(() => {
    if (sessionLoading || !allowed) return;
    void loadSeasons();
  }, [sessionLoading, allowed, loadSeasons]);

  React.useEffect(() => {
    if (sessionLoading || !allowed) return;
    void loadEpisodes();
  }, [sessionLoading, allowed, loadEpisodes]);

  async function createEpisode(e: React.FormEvent) {
    e.preventDefault();
    if (!seasonId) return;
    setCreating(true);
    setError(null);
    try {
      await api.post("/api/producer/episodes", {
        seasonId,
        number: draft.number,
        title: draft.title,
        summary: draft.summary || undefined,
        scheduledFor: draft.scheduledFor || undefined,
      });
      setDraft({
        number: draft.number + 1,
        title: "",
        summary: "",
        scheduledFor: "",
      });
      await loadEpisodes();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Create failed");
    } finally {
      setCreating(false);
    }
  }

  async function patchStatus(id: string, status: Episode["status"]) {
    setBusyId(id);
    setError(null);
    try {
      await api.patch(`/api/producer/episodes/${id}`, {
        status,
        reason: status === "aired" ? "Aired live" : `Status → ${status}`,
      });
      await loadEpisodes();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Update failed");
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
  if (!allowed) {
    return (
      <div className="container py-20 max-w-xl text-center">
        <Badge variant="outline" className="mb-3">Producer or admin only</Badge>
        <Button asChild variant="gradient" size="lg" className="mt-6">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-10 md:py-14 max-w-5xl">
      <ProducerSubNav />

      <Badge variant="outline" className="mb-2">Producer · Episodes</Badge>
      <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
        Plan & <span className="gradient-text">publish</span>.
      </h1>
      <p className="text-sm text-muted-foreground mt-2">
        Add episodes to a season as drafts, schedule them, then mark them
        aired. Publishing flows in one direction:{" "}
        <code>draft → scheduled → aired → archived</code>.
      </p>

      <div className="mt-6 flex items-center gap-3">
        <Label htmlFor="season">Season</Label>
        <select
          id="season"
          value={seasonId}
          onChange={(e) => setSeasonId(e.target.value)}
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
        >
          <option value="">— pick a season —</option>
          {seasons.map((s) => (
            <option key={s.id} value={s.id}>
              S{s.number} · {s.title} ({s.status})
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="mt-6 rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {seasonId && (
        <form
          onSubmit={createEpisode}
          className="mt-6 rounded-2xl border border-border/60 bg-card p-5 grid sm:grid-cols-[80px_1fr_auto] gap-3 items-end"
        >
          <div>
            <Label htmlFor="num">Number</Label>
            <Input
              id="num"
              type="number"
              min={1}
              max={99}
              value={draft.number}
              onChange={(e) =>
                setDraft({ ...draft, number: Number(e.target.value) })
              }
              required
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="ep-title">New episode title</Label>
            <Input
              id="ep-title"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              required
              minLength={2}
              maxLength={160}
              placeholder="e.g. Auditions — Day 1"
              className="mt-1.5"
            />
          </div>
          <Button
            type="submit"
            variant="gradient"
            disabled={creating || !draft.title.trim()}
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Plus className="h-4 w-4 mr-1.5" /> Add episode
              </>
            )}
          </Button>
          <div className="sm:col-span-2">
            <Label htmlFor="summary">Summary (optional)</Label>
            <Textarea
              id="summary"
              rows={2}
              value={draft.summary}
              onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
              maxLength={2000}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="scheduled">Scheduled for (optional)</Label>
            <Input
              id="scheduled"
              type="datetime-local"
              value={draft.scheduledFor}
              onChange={(e) =>
                setDraft({ ...draft, scheduledFor: e.target.value })
              }
              className="mt-1.5"
            />
          </div>
        </form>
      )}

      <div className="mt-8">
        <h2 className="font-semibold flex items-center gap-2">
          <Film className="h-4 w-4 text-brand-500" /> Episodes
        </h2>
        {loading ? (
          <div className="text-center py-10">
            <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
          </div>
        ) : episodes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-10 text-center">
            {seasonId
              ? "No episodes yet for this season."
              : "Pick a season above to see its episodes."}
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {episodes.map((ep) => (
              <li
                key={ep.id}
                className="rounded-2xl border border-border/60 bg-card p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Ep {ep.number}</Badge>
                      <Badge
                        variant={
                          ep.status === "aired" ? "default" : "outline"
                        }
                        className="text-[10px]"
                      >
                        {ep.status}
                      </Badge>
                      {ep.scheduled_for && (
                        <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                          <CalendarClock className="h-3 w-3" />
                          {new Date(ep.scheduled_for).toLocaleString()}
                        </span>
                      )}
                    </div>
                    <p className="font-semibold mt-2">{ep.title}</p>
                    {ep.summary && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {ep.summary}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    {ep.status === "draft" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === ep.id}
                        onClick={() => patchStatus(ep.id, "scheduled")}
                      >
                        Schedule
                      </Button>
                    )}
                    {ep.status === "scheduled" && (
                      <Button
                        size="sm"
                        variant="gradient"
                        disabled={busyId === ep.id}
                        onClick={() => patchStatus(ep.id, "aired")}
                      >
                        <Send className="h-3.5 w-3.5 mr-1.5" /> Mark aired
                      </Button>
                    )}
                    {ep.status === "aired" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === ep.id}
                        onClick={() => patchStatus(ep.id, "archived")}
                      >
                        Archive
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function ProducerEpisodesPage() {
  return (
    <React.Suspense
      fallback={
        <div className="container py-20 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
        </div>
      }
    >
      <ProducerEpisodesInner />
    </React.Suspense>
  );
}
