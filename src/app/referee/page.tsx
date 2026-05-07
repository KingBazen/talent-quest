"use client";

import * as React from "react";
import Link from "next/link";
import {
  Gavel,
  Loader2,
  ListVideo,
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useSession } from "@/components/auth/SessionProvider";
import { RefereeSubNav } from "@/components/referee/SubNav";
import { TALENT_CATEGORIES } from "@/data/categories";
import { api, ApiError } from "@/lib/client-api";

interface QueueItem {
  id: string;
  contestantId: string;
  title: string;
  contestant: string;
  city: string;
  category: string;
  status: string;
  thumbnail: string | null;
  durationSec: number | null;
  reviewedByMe: boolean;
  assignedToMe: boolean;
}

export default function RefereeDashboardPage() {
  const { user, loading: sessionLoading } = useSession();
  const [items, setItems] = React.useState<QueueItem[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const r = await api.get<{ items: QueueItem[] }>("/api/referee/queue");
      setItems(r.items);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load");
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
  if (!user || (user.role !== "referee" && user.role !== "admin")) {
    return (
      <div className="container py-20 max-w-xl text-center">
        <Badge variant="outline" className="mb-3">No referee session</Badge>
        <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
          Sign in as a referee.
        </h1>
        <Button asChild variant="gradient" size="lg" className="mt-6">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  const assigned = items.filter((i) => i.assignedToMe);
  const reviewed = assigned.filter((i) => i.reviewedByMe).length;
  const pct = assigned.length === 0 ? 0 : (reviewed / assigned.length) * 100;
  const nextUp = assigned.find((i) => !i.reviewedByMe);

  return (
    <div className="container py-10 md:py-14 space-y-6">
      <RefereeSubNav />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Badge variant="outline" className="mb-2">Referee · Dashboard</Badge>
          <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
            Score every act on a{" "}
            <span className="gradient-text">100-point</span> rubric.
          </h1>
        </div>
        <Badge variant="gradient">
          <Sparkles className="h-3 w-3 mr-1" />
          {reviewed} of {assigned.length} reviewed
        </Badge>
      </div>

      {error && (
        <p className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Progress card */}
      <div className="rounded-2xl border border-border/60 bg-card p-6 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Your queue</p>
            <h2 className="font-display text-2xl font-bold">
              {Math.round(pct)}% complete
            </h2>
          </div>
          {nextUp && (
            <Button asChild variant="gradient">
              <Link href={`/referee/submissions/${nextUp.id}`}>
                Score next: {nextUp.title.slice(0, 30)}
                {nextUp.title.length > 30 ? "…" : ""}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
        <Progress value={pct} />
      </div>

      {/* Empty state */}
      {assigned.length === 0 ? (
        <div className="rounded-2xl border border-border/60 bg-card p-10 text-center">
          <Gavel className="h-10 w-10 mx-auto text-muted-foreground" />
          <h2 className="mt-4 font-display text-xl font-bold">
            No assignments yet
          </h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
            Admins assign submissions to specific referees so the panel can
            balance load. Once you have items, they appear here.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <ListVideo className="h-4 w-4 text-brand-500" />
              Up next
            </h3>
            <Button asChild variant="ghost" size="sm">
              <Link href="/referee/submissions">
                See all <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {assigned.slice(0, 6).map((q) => {
              const cat = TALENT_CATEGORIES.find((c) => c.id === q.category);
              return (
                <Link
                  key={q.id}
                  href={`/referee/submissions/${q.id}`}
                  className="block rounded-xl border border-border/60 bg-background p-3 hover:border-brand-500/50 transition-colors"
                >
                  <div
                    className="aspect-video rounded-md bg-muted bg-cover bg-center mb-2"
                    style={
                      q.thumbnail
                        ? { backgroundImage: `url(${q.thumbnail})` }
                        : undefined
                    }
                  />
                  <p className="text-sm font-medium line-clamp-1">{q.title}</p>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">
                    {cat?.emoji} {cat?.name ?? q.category} · {q.contestant}
                  </p>
                  {q.reviewedByMe && (
                    <Badge
                      variant="gradient"
                      className="mt-1.5 text-[10px] inline-flex items-center"
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" /> reviewed
                    </Badge>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
