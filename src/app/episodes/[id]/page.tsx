"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2, Play, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/client-api";

interface EpisodeDetail {
  season: { id: string; number: number; title: string };
  episode: {
    id: string;
    number: number;
    title: string;
    summary: string | null;
    thumbnailUrl: string | null;
    scheduledFor: string | null;
    status: "scheduled" | "aired";
    airedAt: string | null;
  };
  challenges: {
    id: string;
    title: string;
    description: string | null;
    pointsMax: number;
  }[];
  performances: {
    id: string;
    contestantId: string;
    contestantDisplay: string;
    challengeId: string | null;
    videoUrl: string | null;
    score: number | null;
    notes: string | null;
  }[];
  eliminations: {
    contestantId: string;
    contestantDisplay: string;
    reason: string | null;
    eliminatedAt: string;
  }[];
}

export default function PublicEpisodePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [data, setData] = React.useState<EpisodeDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await api.get<EpisodeDetail>(`/api/episodes/${id}`);
        setData(r);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

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
        <Badge variant="outline" className="mb-3">Episode</Badge>
        <p className="text-muted-foreground">{error ?? "Not found"}</p>
        <Button asChild variant="ghost" size="sm" className="mt-4">
          <Link href="/episodes">All episodes</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-10 md:py-14 max-w-3xl">
      <Link
        href="/episodes"
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        ← all episodes
      </Link>

      <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Badge variant="outline">Season {data.season.number}</Badge>
        <span>·</span>
        <span>{data.season.title}</span>
        <span>·</span>
        <span>Episode {data.episode.number}</span>
      </div>

      <h1 className="mt-3 font-display text-3xl md:text-5xl font-bold tracking-tight">
        {data.episode.title}
      </h1>
      {data.episode.summary && (
        <p className="mt-3 text-muted-foreground text-lg">
          {data.episode.summary}
        </p>
      )}

      <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
        <Badge
          variant={data.episode.status === "aired" ? "default" : "outline"}
        >
          {data.episode.status}
        </Badge>
        {data.episode.airedAt && (
          <span>aired {new Date(data.episode.airedAt).toLocaleString()}</span>
        )}
        {data.episode.scheduledFor && data.episode.status === "scheduled" && (
          <span>
            scheduled for {new Date(data.episode.scheduledFor).toLocaleString()}
          </span>
        )}
      </div>

      <div className="mt-6 aspect-video rounded-2xl border border-border/60 bg-gradient-to-br from-brand-500/10 to-brand-700/10 flex items-center justify-center">
        {data.episode.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.episode.thumbnailUrl}
            alt={data.episode.title}
            className="h-full w-full object-cover rounded-2xl"
          />
        ) : (
          <Play className="h-16 w-16 text-brand-500/60" />
        )}
      </div>

      {data.challenges.length > 0 && (
        <section className="mt-10">
          <h2 className="font-semibold">Challenges</h2>
          <ol className="mt-3 space-y-3">
            {data.challenges.map((c, i) => (
              <li
                key={c.id}
                className="rounded-xl border border-border/60 bg-card p-4"
              >
                <p className="text-xs text-muted-foreground">
                  Challenge {i + 1} · max {c.pointsMax}
                </p>
                <p className="font-semibold mt-1">{c.title}</p>
                {c.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {c.description}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {data.performances.length > 0 && (
        <section className="mt-10">
          <h2 className="font-semibold">Performances</h2>
          <ul className="mt-3 grid sm:grid-cols-2 gap-3">
            {data.performances.map((p) => (
              <li
                key={p.id}
                className="rounded-xl border border-border/60 bg-card p-4"
              >
                <Link
                  href={`/contestants/${p.contestantId}`}
                  className="font-semibold hover:text-brand-500"
                >
                  {p.contestantDisplay}
                </Link>
                {p.score !== null && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Score: <span className="font-semibold">{p.score}</span>
                  </p>
                )}
                {p.notes && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {p.notes}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.eliminations.length > 0 && (
        <section className="mt-10">
          <h2 className="font-semibold flex items-center gap-2">
            <X className="h-4 w-4 text-destructive" />
            Eliminated this episode
          </h2>
          <ul className="mt-3 space-y-2">
            {data.eliminations.map((e) => (
              <li
                key={e.contestantId}
                className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm flex items-center justify-between"
              >
                <Link
                  href={`/contestants/${e.contestantId}`}
                  className="font-semibold hover:text-foreground"
                >
                  {e.contestantDisplay}
                </Link>
                {e.reason && (
                  <span className="text-xs text-muted-foreground">
                    {e.reason}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
