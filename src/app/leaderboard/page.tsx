"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, Trophy, Vote } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { api, ApiError } from "@/lib/client-api";
import { TALENT_CATEGORIES } from "@/data/categories";

interface LeaderboardItem {
  contestantId: string;
  displayName: string;
  category: string;
  city: string;
  votes: number;
}

interface CategoryTally {
  category: string;
  votes: number;
}

interface LeaderboardData {
  round: number;
  votingOpen: boolean;
  items: LeaderboardItem[];
  byCategory: CategoryTally[];
}

export default function PublicLeaderboardPage() {
  const [data, setData] = React.useState<LeaderboardData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [category, setCategory] = React.useState<string>("");

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (category) params.set("category", category);
        params.set("limit", "100");
        const r = await api.get<LeaderboardData>(`/api/leaderboard?${params}`);
        setData(r);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [category]);

  return (
    <div className="container py-12 md:py-16 max-w-4xl">
      <Badge variant="outline" className="mb-3">Fan vote</Badge>
      <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight">
        The fan <span className="gradient-text">leaderboard</span>.
      </h1>
      <p className="mt-3 text-muted-foreground text-lg max-w-2xl">
        Public popularity vote. Independent of the industry-panel score —
        round progression is decided by the panel; this is the sound of the
        crowd.
      </p>

      {data && (
        <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
          <Badge variant={data.votingOpen ? "default" : "outline"}>
            Round {data.round} · {data.votingOpen ? "open" : "closed"}
          </Badge>
          {data.byCategory.length > 0 && (
            <span className="text-muted-foreground">
              {data.byCategory.reduce((a, b) => a + b.votes, 0).toLocaleString()}{" "}
              total votes this round
            </span>
          )}
        </div>
      )}

      <div className="mt-6 flex items-center gap-2">
        <button
          onClick={() => setCategory("")}
          className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
            category === ""
              ? "bg-gradient-to-r from-brand-400 to-brand-600 text-white border-transparent"
              : "border-border/60 text-muted-foreground hover:text-foreground"
          }`}
        >
          All
        </button>
        {TALENT_CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
              category === c.id
                ? "bg-gradient-to-r from-brand-400 to-brand-600 text-white border-transparent"
                : "border-border/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-6 rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="mt-8 rounded-2xl border border-border/60 bg-card overflow-hidden">
        {loading ? (
          <div className="text-center py-16">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="text-center py-16">
            <Vote className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground mt-3">
              No votes yet for this category. Be the first.
            </p>
          </div>
        ) : (
          <ol>
            {data.items.map((it, i) => (
              <li
                key={it.contestantId}
                className="flex items-center gap-4 px-5 py-4 border-b border-border/60 last:border-b-0"
              >
                <div
                  className={`h-9 w-9 rounded-lg flex items-center justify-center font-bold text-sm ${
                    i === 0
                      ? "bg-gradient-to-br from-yellow-400 to-yellow-600 text-black"
                      : i === 1
                      ? "bg-gradient-to-br from-zinc-300 to-zinc-500 text-black"
                      : i === 2
                      ? "bg-gradient-to-br from-amber-700 to-amber-900 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i < 3 ? <Trophy className="h-4 w-4" /> : i + 1}
                </div>
                <Link
                  href={`/contestants/${it.contestantId}`}
                  className="flex-1 min-w-0 hover:text-brand-500 transition-colors"
                >
                  <p className="font-semibold truncate">{it.displayName}</p>
                  <p className="text-xs text-muted-foreground">
                    {it.city} · {it.category}
                  </p>
                </Link>
                <div className="text-right shrink-0">
                  <p className="font-bold tabular-nums">
                    {it.votes.toLocaleString()}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    votes
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
