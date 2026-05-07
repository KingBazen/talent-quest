"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, Plus, Tv } from "lucide-react";
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
  summary: string | null;
  status: "draft" | "active" | "closed";
  starts_at: string | null;
  ends_at: string | null;
}

export default function ProducerDashboardPage() {
  const { user, loading: sessionLoading } = useSession();
  const [seasons, setSeasons] = React.useState<Season[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [draft, setDraft] = React.useState({
    number: 1,
    title: "",
    summary: "",
  });

  const allowed = user?.role === "producer" || user?.role === "admin";

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.get<{ items: Season[] }>("/api/producer/seasons");
      setSeasons(r.items);
      const next = (r.items[0]?.number ?? 0) + 1;
      setDraft((d) => ({ ...d, number: Math.max(next, 1) }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!sessionLoading && allowed) void load();
  }, [load, sessionLoading, allowed]);

  async function createSeason(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await api.post("/api/producer/seasons", draft);
      setDraft({ number: draft.number + 1, title: "", summary: "" });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Create failed");
    } finally {
      setCreating(false);
    }
  }

  async function patchStatus(id: string, status: Season["status"]) {
    try {
      await api.patch(`/api/producer/seasons/${id}`, { status });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Update failed");
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

      <Badge variant="outline" className="mb-2">Producer</Badge>
      <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
        Build the <span className="gradient-text">season</span>.
      </h1>
      <p className="text-sm text-muted-foreground mt-2">
        Create a season, schedule episodes, and publish them one by one. The
        public sees only seasons in <code>active</code>/<code>closed</code> and
        episodes in <code>scheduled</code>/<code>aired</code>.
      </p>

      {error && (
        <p className="mt-6 rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <form
        onSubmit={createSeason}
        className="mt-8 rounded-2xl border border-border/60 bg-card p-5 grid sm:grid-cols-[80px_1fr_auto] gap-3 items-end"
      >
        <div>
          <Label htmlFor="number">Number</Label>
          <Input
            id="number"
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
          <Label htmlFor="title">New season title</Label>
          <Input
            id="title"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            required
            minLength={2}
            maxLength={120}
            placeholder="e.g. Bling Records Show — Season 1"
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
              <Plus className="h-4 w-4 mr-1.5" /> Create season
            </>
          )}
        </Button>
        <div className="sm:col-span-3">
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
      </form>

      <div className="mt-10">
        <h2 className="font-semibold flex items-center gap-2">
          <Tv className="h-4 w-4 text-brand-500" /> Seasons
        </h2>
        {loading ? (
          <div className="text-center py-10">
            <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
          </div>
        ) : seasons.length === 0 ? (
          <p className="text-sm text-muted-foreground py-10 text-center">
            No seasons yet. Create one above to get started.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {seasons.map((s) => (
              <li
                key={s.id}
                className="rounded-2xl border border-border/60 bg-card p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Season {s.number}</Badge>
                      <Badge
                        variant={s.status === "active" ? "default" : "outline"}
                        className="text-[10px]"
                      >
                        {s.status}
                      </Badge>
                    </div>
                    <p className="font-semibold mt-2">{s.title}</p>
                    {s.summary && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {s.summary}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/producer/episodes?seasonId=${s.id}`}>
                        Episodes
                      </Link>
                    </Button>
                    {s.status === "draft" && (
                      <Button
                        size="sm"
                        variant="gradient"
                        onClick={() => patchStatus(s.id, "active")}
                      >
                        Publish (active)
                      </Button>
                    )}
                    {s.status === "active" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => patchStatus(s.id, "closed")}
                      >
                        Close season
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
