"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/auth/SessionProvider";
import { ProducerSubNav } from "@/components/producer/SubNav";
import { api, ApiError } from "@/lib/client-api";

interface Season {
  id: string;
  number: number;
  title: string;
  status: string;
}
interface Episode {
  id: string;
  season_id: string;
  number: number;
  title: string;
  scheduled_for: string | null;
  status: "draft" | "scheduled" | "aired" | "archived";
  aired_at: string | null;
}

export default function ProducerSchedulePage() {
  const { user, loading: sessionLoading } = useSession();
  const [seasons, setSeasons] = React.useState<Season[]>([]);
  const [episodesBySeason, setEpisodesBySeason] = React.useState<
    Record<string, Episode[]>
  >({});
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const allowed = user?.role === "producer" || user?.role === "admin";

  React.useEffect(() => {
    if (sessionLoading || !allowed) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const sR = await api.get<{ items: Season[] }>(
          "/api/producer/seasons"
        );
        setSeasons(sR.items);
        const map: Record<string, Episode[]> = {};
        for (const s of sR.items) {
          const eR = await api.get<{ items: Episode[] }>(
            `/api/producer/episodes?seasonId=${s.id}`
          );
          map[s.id] = eR.items;
        }
        setEpisodesBySeason(map);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionLoading, allowed]);

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

      <Badge variant="outline" className="mb-2">Producer · Schedule</Badge>
      <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
        The <span className="gradient-text">timeline</span>.
      </h1>
      <p className="text-sm text-muted-foreground mt-2">
        Every episode across every season, sorted chronologically. Edit
        scheduled dates from the Episodes tab.
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
      ) : seasons.length === 0 ? (
        <p className="text-sm text-muted-foreground py-10 text-center">
          No seasons yet. Head to the Dashboard tab to create one.
        </p>
      ) : (
        <div className="mt-8 space-y-8">
          {seasons.map((s) => {
            const eps = (episodesBySeason[s.id] ?? []).slice().sort((a, b) => {
              const aTs = a.scheduled_for
                ? new Date(a.scheduled_for).getTime()
                : Number.MAX_SAFE_INTEGER;
              const bTs = b.scheduled_for
                ? new Date(b.scheduled_for).getTime()
                : Number.MAX_SAFE_INTEGER;
              return aTs - bTs;
            });
            return (
              <div
                key={s.id}
                className="rounded-2xl border border-border/60 bg-card p-5"
              >
                <h2 className="font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-brand-500" />
                  Season {s.number} · {s.title}
                  <Badge variant="outline" className="text-[10px]">
                    {s.status}
                  </Badge>
                </h2>
                {eps.length === 0 ? (
                  <p className="text-sm text-muted-foreground mt-3">
                    No episodes added yet.
                  </p>
                ) : (
                  <ol className="mt-4 space-y-2">
                    {eps.map((ep) => (
                      <li
                        key={ep.id}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border/60 bg-background"
                      >
                        <span className="text-xs font-mono w-10 text-right shrink-0 text-muted-foreground">
                          E{ep.number.toString().padStart(2, "0")}
                        </span>
                        <Link
                          href={`/producer/episodes?seasonId=${s.id}`}
                          className="flex-1 min-w-0 text-sm hover:text-brand-500 truncate"
                        >
                          {ep.title}
                        </Link>
                        <Badge variant="outline" className="text-[10px]">
                          {ep.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground tabular-nums w-44 text-right shrink-0">
                          {ep.scheduled_for
                            ? new Date(ep.scheduled_for).toLocaleString()
                            : "—"}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
