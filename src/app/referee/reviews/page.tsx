"use client";

import * as React from "react";
import Link from "next/link";
import { History, Loader2, Trophy, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "@/components/auth/SessionProvider";
import { RefereeSubNav } from "@/components/referee/SubNav";
import { TALENT_CATEGORIES } from "@/data/categories";
import { api, ApiError } from "@/lib/client-api";

interface ReviewRow {
  submissionId: string;
  contestantId: string;
  title: string;
  category: string;
  status: string;
  city: string;
  contestant: string;
  total: number;
  notes: string | null;
  publicNotes: string | null;
  updatedAt: string | null;
}

export default function RefereeReviewsPage() {
  const { user, loading } = useSession();
  const [items, setItems] = React.useState<ReviewRow[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");

  React.useEffect(() => {
    if (loading) return;
    if (!user || (user.role !== "referee" && user.role !== "admin")) return;
    api
      .get<{ items: ReviewRow[] }>("/api/referee/reviews")
      .then((r) => setItems(r.items))
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : "Failed to load")
      );
  }, [loading, user]);

  if (loading || items === null) {
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

  const filtered = items.filter((it) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    const hay =
      `${it.title} ${it.contestant} ${it.city} ${it.contestantId}`.toLowerCase();
    return hay.includes(q);
  });

  const avg =
    items.length === 0
      ? null
      : Math.round(items.reduce((s, r) => s + r.total, 0) / items.length);

  return (
    <div className="container py-10 md:py-14 space-y-6 max-w-4xl">
      <RefereeSubNav />

      <div>
        <Badge variant="outline" className="mb-2">Referee · My reviews</Badge>
        <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
          Your <span className="gradient-text">scoring</span> history.
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          {items.length} review{items.length === 1 ? "" : "s"}
          {avg !== null && (
            <>
              {" "}
              · average <strong className="text-foreground">{avg}</strong> / 100
              given by you
            </>
          )}
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search title, stage name, contestant ID…"
      />

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border/60 bg-card p-10 text-center">
          <History className="h-10 w-10 mx-auto text-muted-foreground" />
          <h2 className="mt-4 font-display text-xl font-bold">
            {items.length === 0
              ? "You haven't scored anything yet"
              : "No reviews match that search"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {items.length === 0
              ? "Once you submit a score, it shows up here."
              : "Try a different keyword."}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((r) => {
            const cat = TALENT_CATEGORIES.find((c) => c.id === r.category);
            return (
              <li
                key={r.submissionId}
                className="rounded-2xl border border-border/60 bg-card p-4 flex flex-col sm:flex-row sm:items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {cat?.emoji} {cat?.name ?? r.category}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] font-mono">
                      ID {r.contestantId}
                    </Badge>
                    <Badge
                      variant={badgeForStatus(r.status)}
                      className="text-[10px] capitalize"
                    >
                      {r.status}
                    </Badge>
                  </div>
                  <p className="font-semibold line-clamp-1">{r.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.contestant} · {r.city}
                    {r.updatedAt && (
                      <>
                        {" "}
                        · scored {new Date(r.updatedAt).toLocaleDateString()}
                      </>
                    )}
                  </p>
                  {(r.publicNotes || r.notes) && (
                    <p className="mt-2 text-xs text-muted-foreground line-clamp-2 italic">
                      &ldquo;{r.publicNotes || r.notes}&rdquo;
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      My total
                    </p>
                    <p className="font-display text-2xl font-bold gradient-text inline-flex items-center gap-1">
                      <Trophy className="h-4 w-4 text-gold-500" />
                      {r.total}
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/referee/submissions/${r.submissionId}`}>
                      <Eye className="h-3.5 w-3.5 mr-1.5" /> Open
                    </Link>
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function badgeForStatus(
  s: string
): "secondary" | "outline" | "gradient" | "default" {
  switch (s) {
    case "approved":
      return "gradient";
    case "pending":
      return "outline";
    case "flagged":
    case "rejected":
    case "superseded":
      return "secondary";
    default:
      return "outline";
  }
}
