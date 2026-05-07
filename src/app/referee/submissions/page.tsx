"use client";

import * as React from "react";
import Link from "next/link";
import {
  ListVideo,
  Loader2,
  Filter,
  CheckCircle2,
  Eye,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "@/components/auth/SessionProvider";
import { RefereeSubNav } from "@/components/referee/SubNav";
import { TALENT_CATEGORIES } from "@/data/categories";
import { api, ApiError } from "@/lib/client-api";
import type { TalentCategoryId } from "@/types";
import { cn } from "@/lib/utils";

interface QueueItem {
  id: string;
  contestantId: string;
  title: string;
  contestant: string;
  city: string;
  category: string;
  status: "pending" | "approved" | "rejected" | "flagged" | "superseded";
  thumbnail: string | null;
  videoUrl: string | null;
  durationSec: number | null;
  reviewedByMe: boolean;
  assignedToMe: boolean;
}

type ReviewedFilter = "all" | "scored" | "unscored";

export default function RefereeSubmissionsPage() {
  const { user, loading: sessionLoading } = useSession();
  const [items, setItems] = React.useState<QueueItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [includeUnassigned, setIncludeUnassigned] = React.useState(false);

  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState<TalentCategoryId | "">("");
  const [reviewed, setReviewed] = React.useState<ReviewedFilter>("all");

  const isAdmin = user?.role === "admin";

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (isAdmin && includeUnassigned) qs.set("includeUnassigned", "1");
      const r = await api.get<{ items: QueueItem[] }>(
        `/api/referee/queue${qs.toString() ? `?${qs}` : ""}`
      );
      setItems(r.items);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [includeUnassigned, isAdmin]);

  React.useEffect(() => {
    if (!sessionLoading && (user?.role === "referee" || user?.role === "admin")) {
      void load();
    }
  }, [load, sessionLoading, user]);

  const filtered = React.useMemo(() => {
    return items.filter((it) => {
      if (category && it.category !== category) return false;
      if (reviewed === "scored" && !it.reviewedByMe) return false;
      if (reviewed === "unscored" && it.reviewedByMe) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const hay = `${it.title} ${it.contestant} ${it.city} ${it.contestantId}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, category, reviewed, search]);

  if (sessionLoading) {
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

  const assignedCount = items.filter((i) => i.assignedToMe).length;
  const unassignedCount = items.filter((i) => !i.assignedToMe).length;
  const unscoredAssigned = items.filter(
    (i) => i.assignedToMe && !i.reviewedByMe
  ).length;

  return (
    <div className="container py-10 md:py-14 space-y-6">
      <RefereeSubNav />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Badge variant="outline" className="mb-2">Referee · Submissions</Badge>
          <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
            <span className="gradient-text">Filterable</span> review queue.
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            {assignedCount} assigned to you · {unscoredAssigned} unscored
            {isAdmin && includeUnassigned && unassignedCount > 0 && (
              <> · {unassignedCount} unassigned (admin view)</>
            )}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()}>
          Refresh
        </Button>
      </div>

      {/* Filter bar */}
      <div className="rounded-2xl border border-border/60 bg-card p-4 grid sm:grid-cols-[1fr_auto_auto] gap-3 items-end">
        <div className="space-y-1.5">
          <label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Filter className="h-3 w-3" /> Search
          </label>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Title, stage name, city, contestant ID…"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs uppercase tracking-wider text-muted-foreground">
            Category
          </label>
          <select
            value={category}
            onChange={(e) =>
              setCategory(e.target.value as TalentCategoryId | "")
            }
            className="h-11 rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="">All</option>
            {TALENT_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs uppercase tracking-wider text-muted-foreground">
            Scored
          </label>
          <select
            value={reviewed}
            onChange={(e) => setReviewed(e.target.value as ReviewedFilter)}
            className="h-11 rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="all">All</option>
            <option value="unscored">Unscored</option>
            <option value="scored">Scored</option>
          </select>
        </div>
        {isAdmin && (
          <label className="flex items-center gap-2 text-sm rounded-lg border border-border/60 bg-background px-3 py-2 cursor-pointer sm:col-span-3">
            <input
              type="checkbox"
              checked={includeUnassigned}
              onChange={(e) => setIncludeUnassigned(e.target.checked)}
            />
            Include unassigned pool (admin view)
          </label>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {loading ? (
        <div className="text-center text-muted-foreground py-10">
          <Loader2 className="h-5 w-5 animate-spin mx-auto" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState items={items} />
      ) : (
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((it) => {
            const cat = TALENT_CATEGORIES.find((c) => c.id === it.category);
            return (
              <li key={it.id}>
                <Link
                  href={`/referee/submissions/${it.id}`}
                  className={cn(
                    "block rounded-2xl border overflow-hidden hover:border-brand-500/50 transition-colors",
                    it.reviewedByMe
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : "border-border/60 bg-card"
                  )}
                >
                  <div
                    className="aspect-video bg-muted bg-cover bg-center"
                    style={
                      it.thumbnail
                        ? { backgroundImage: `url(${it.thumbnail})` }
                        : undefined
                    }
                  />
                  <div className="p-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono text-muted-foreground">
                        ID {it.contestantId}
                      </span>
                      <div className="flex gap-1">
                        {!it.assignedToMe && (
                          <Badge variant="outline" className="text-[10px]">
                            unassigned
                          </Badge>
                        )}
                        <Badge
                          variant={badgeForStatus(it.status)}
                          className="text-[10px] capitalize"
                        >
                          {it.status}
                        </Badge>
                      </div>
                    </div>
                    <p className="font-semibold line-clamp-1">{it.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {cat?.emoji} {cat?.name ?? it.category} · {it.contestant}{" "}
                      · {it.city}
                    </p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {it.durationSec
                          ? `${Math.floor(it.durationSec / 60)}:${String(
                              it.durationSec % 60
                            ).padStart(2, "0")}`
                          : "—"}
                      </span>
                      {it.reviewedByMe ? (
                        <span className="inline-flex items-center gap-1 text-emerald-500">
                          <CheckCircle2 className="h-3 w-3" /> reviewed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-brand-500">
                          <Eye className="h-3 w-3" /> unscored
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function EmptyState({ items }: { items: QueueItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-10 text-center">
        <ListVideo className="h-10 w-10 mx-auto text-muted-foreground" />
        <h2 className="mt-4 font-display text-xl font-bold">
          No submissions assigned to you yet
        </h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
          An admin assigns submissions to specific referees so the panel can
          balance the load. Once you have items, they show up here.
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-10 text-center">
      <AlertTriangle className="h-10 w-10 mx-auto text-muted-foreground" />
      <h2 className="mt-4 font-display text-xl font-bold">
        No submissions match those filters
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Loosen the category or scored filters to see more.
      </p>
    </div>
  );
}

function badgeForStatus(
  s: QueueItem["status"]
): "secondary" | "outline" | "gradient" | "default" {
  switch (s) {
    case "approved":
      return "gradient";
    case "pending":
      return "outline";
    case "flagged":
      return "secondary";
    case "rejected":
      return "secondary";
    case "superseded":
      return "secondary";
  }
}
