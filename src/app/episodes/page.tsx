"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, Play, CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { api, ApiError } from "@/lib/client-api";

interface PublicEpisode {
  id: string;
  seasonId: string;
  seasonNumber: number;
  seasonTitle: string;
  number: number;
  title: string;
  summary: string | null;
  thumbnailUrl: string | null;
  scheduledFor: string | null;
  status: "scheduled" | "aired";
  airedAt: string | null;
}

interface PublicSeason {
  id: string;
  number: number;
  title: string;
  summary: string | null;
  status: string;
}

interface Data {
  seasons: PublicSeason[];
  items: PublicEpisode[];
}

export default function PublicEpisodesPage() {
  const [data, setData] = React.useState<Data | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await api.get<Data>("/api/episodes");
        setData(r);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="container py-12 md:py-16 max-w-5xl">
      <Badge variant="outline" className="mb-3">Episodes</Badge>
      <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight">
        Watch the <span className="gradient-text">show</span>.
      </h1>
      <p className="mt-3 text-muted-foreground text-lg max-w-2xl">
        Every published episode across every season. Performance highlights,
        challenge results, and elimination announcements as they happen.
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
      ) : !data || data.items.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-border/60 bg-card p-12 text-center">
          <p className="text-muted-foreground">
            No episodes have aired yet. Check back once the season is live.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-10">
          {data.seasons
            .filter((s) => data.items.some((e) => e.seasonId === s.id))
            .map((s) => {
              const eps = data.items
                .filter((e) => e.seasonId === s.id)
                .sort((a, b) => a.number - b.number);
              return (
                <div key={s.id}>
                  <h2 className="font-display text-2xl font-bold tracking-tight">
                    Season {s.number} ·{" "}
                    <span className="text-muted-foreground font-normal">
                      {s.title}
                    </span>
                  </h2>
                  <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {eps.map((ep) => (
                      <Link
                        key={ep.id}
                        href={`/episodes/${ep.id}`}
                        className="rounded-2xl border border-border/60 bg-card overflow-hidden hover:border-brand-500/50 transition-colors"
                      >
                        <div className="aspect-video bg-gradient-to-br from-brand-500/20 to-brand-700/20 relative flex items-center justify-center">
                          {ep.thumbnailUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={ep.thumbnailUrl}
                              alt={ep.title}
                              className="absolute inset-0 h-full w-full object-cover"
                            />
                          ) : (
                            <Play className="h-10 w-10 text-brand-500/70" />
                          )}
                          <Badge
                            variant={ep.status === "aired" ? "default" : "outline"}
                            className="absolute top-2 right-2 text-[10px]"
                          >
                            {ep.status}
                          </Badge>
                        </div>
                        <div className="p-4">
                          <p className="text-xs text-muted-foreground">
                            Episode {ep.number}
                          </p>
                          <p className="font-semibold truncate mt-0.5">
                            {ep.title}
                          </p>
                          {ep.summary && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {ep.summary}
                            </p>
                          )}
                          {(ep.airedAt || ep.scheduledFor) && (
                            <p className="text-[11px] text-muted-foreground mt-2 inline-flex items-center gap-1">
                              <CalendarClock className="h-3 w-3" />
                              {ep.airedAt
                                ? `aired ${new Date(ep.airedAt).toLocaleDateString()}`
                                : `scheduled ${new Date(ep.scheduledFor!).toLocaleDateString()}`}
                            </p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
