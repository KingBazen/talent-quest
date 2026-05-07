"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Trophy, Loader2, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/components/auth/SessionProvider";
import { ContestantSubNav } from "@/components/contestant/SubNav";
import { TALENT_CATEGORIES } from "@/data/categories";
import { statusCopy } from "@/lib/status-copy";
import { api } from "@/lib/client-api";

interface ScoreSummary {
  total: number;
  judges: number;
}

export default function ContestantResultPage() {
  const { user, contestant, loading } = useSession();
  const [score, setScore] = React.useState<ScoreSummary | null>(null);

  React.useEffect(() => {
    if (!contestant) return;
    api
      .get<{ contestant: unknown; score: ScoreSummary | null }>(
        `/api/contestants/${contestant.id}`
      )
      .then((d) => setScore(d.score))
      .catch(() => setScore(null));
  }, [contestant]);

  if (loading) {
    return (
      <div className="container py-20 text-center">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
      </div>
    );
  }

  if (!user || user.role !== "contestant" || !contestant) {
    return (
      <div className="container py-20 max-w-xl text-center">
        <Badge variant="outline" className="mb-3">No contestant session</Badge>
        <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
          Sign in to view your result.
        </h1>
        <Button asChild variant="gradient" size="lg" className="mt-6">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  const cat = TALENT_CATEGORIES.find((c) => c.id === contestant.category);
  const completed = contestant.progress.filter((p) => p.done).length;
  const copy = statusCopy(contestant.status);

  return (
    <div className="container py-10 md:py-14 max-w-3xl">
      <ContestantSubNav />

      <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">
        Your <span className="gradient-text">result</span>.
      </h1>
      <p className="mt-2 text-muted-foreground">
        Same view the public sees on the result-checker, plus your full name.
        Share your 6-digit ID with friends so they can root for you on{" "}
        <Link href="/result-checker" className="underline hover:text-foreground">
          /result-checker
        </Link>
        .
      </p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-8 rounded-2xl border border-border/60 bg-card p-6"
      >
        <div className="flex flex-wrap items-center gap-3">
          <Trophy className="h-6 w-6 text-gold-500" />
          <h2 className="font-display text-2xl font-bold">
            {contestant.fullName}
          </h2>
          <Badge variant={copy.badge}>{copy.label}</Badge>
        </div>
        <p className="text-muted-foreground mt-1">
          ID <span className="font-mono">{contestant.id}</span> ·{" "}
          {cat?.name ?? contestant.category} · {contestant.city}
        </p>

        <p className="mt-4 text-sm text-muted-foreground">{copy.description}</p>
        <p className="mt-2 text-xs font-semibold text-brand-500">
          Next: {copy.nextStep}
        </p>

        <div className="mt-6 grid sm:grid-cols-2 gap-3 text-center">
          <Stat
            label="Stages cleared"
            value={`${completed}/${contestant.progress.length}`}
          />
          <Stat
            label="Score"
            value={
              score
                ? `${score.total} / 100 (${score.judges} ${
                    score.judges === 1 ? "judge" : "judges"
                  })`
                : "Awaiting judges"
            }
          />
        </div>

        <ol className="mt-6 grid sm:grid-cols-2 gap-2">
          {contestant.progress.map((p) => (
            <li
              key={p.key}
              className="flex items-center gap-3 rounded-xl border border-border/60 bg-background px-4 py-3 text-sm"
            >
              {p.done ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <Clock className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="flex-1 font-medium">{p.label}</span>
              <span className="text-xs text-muted-foreground">
                {p.done && p.date ? new Date(p.date).toLocaleDateString() : "—"}
              </span>
            </li>
          ))}
        </ol>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button asChild variant="gradient">
            <Link href="/contestant/dashboard">Open dashboard</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/result-checker">Public result-checker</Link>
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-display text-xl font-bold mt-1">{value}</p>
    </div>
  );
}
