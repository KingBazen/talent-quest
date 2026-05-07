"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, Film, Search, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "@/components/auth/SessionProvider";
import { AdminSubNav } from "@/components/admin/SubNav";
import { TALENT_CATEGORIES } from "@/data/categories";
import { api, ApiError } from "@/lib/client-api";
import type { TalentCategoryId } from "@/types";

interface Row {
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
  createdAt: string;
  score: { total: number; judges: number } | null;
}

const STATUS_OPTIONS = [
  "pending",
  "approved",
  "rejected",
  "flagged",
  "superseded",
] as const;

export default function AdminSubmissionsListPage() {
  const { user, loading: sessionLoading } = useSession();
  const [items, setItems] = React.useState<Row[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState<TalentCategoryId | "">("");
  const [status, setStatus] = React.useState<
    (typeof STATUS_OPTIONS)[number] | ""
  >("");

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (search.trim()) qs.set("q", search.trim());
      if (category) qs.set("category", category);
      if (status) qs.set("status", status);
      const r = await api.get<{ items: Row[]; total: number }>(
        `/api/admin/submissions?${qs}`
      );
      setItems(r.items);
      setTotal(r.total);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [search, category, status]);

  React.useEffect(() => {
    if (!sessionLoading && user?.role === "admin") void load();
  }, [load, sessionLoading, user]);

  if (sessionLoading) {
    return (
      <div className="container py-20 text-center">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
      </div>
    );
  }
  if (!user || user.role !== "admin") {
    return (
      <div className="container py-20 max-w-xl text-center">
        <Badge variant="outline" className="mb-3">Admin only</Badge>
        <Button asChild variant="gradient" size="lg" className="mt-6">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-10 md:py-14 space-y-6">
      <AdminSubNav />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Badge variant="outline" className="mb-2">Admin · Submissions</Badge>
          <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
            Every <span className="gradient-text">audition</span>, filterable.
          </h1>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()}>
          Refresh
        </Button>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-4 grid sm:grid-cols-[1fr_auto_auto] gap-3 items-end">
        <div className="space-y-1.5">
          <label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Search className="h-3 w-3" /> Search
          </label>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Title or contestant ID…"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Filter className="h-3 w-3" /> Category
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
            Status
          </label>
          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as (typeof STATUS_OPTIONS)[number] | "")
            }
            className="h-11 rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="">All</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="rounded-2xl border border-border/60 bg-card p-4 md:p-6">
        <h3 className="font-semibold flex items-center gap-2 mb-4">
          <Film className="h-4 w-4 text-brand-500" />
          {total.toLocaleString()} submissions
        </h3>
        {loading ? (
          <div className="text-center text-muted-foreground py-10">
            <Loader2 className="h-5 w-5 animate-spin mx-auto" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-center text-muted-foreground py-10">
            No submissions match those filters.
          </p>
        ) : (
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((s) => {
              const cat = TALENT_CATEGORIES.find((c) => c.id === s.category);
              return (
                <li key={s.id}>
                  <Link
                    href={`/admin/contestants/${s.contestantId}`}
                    className="block rounded-2xl border border-border/60 bg-background overflow-hidden hover:border-brand-500/50 transition-colors"
                  >
                    <div
                      className="aspect-video bg-muted bg-cover bg-center"
                      style={
                        s.thumbnail
                          ? { backgroundImage: `url(${s.thumbnail})` }
                          : undefined
                      }
                    />
                    <div className="p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono text-muted-foreground">
                          ID {s.contestantId}
                        </span>
                        <Badge
                          variant={badgeForStatus(s.status)}
                          className="text-[10px] capitalize"
                        >
                          {s.status}
                        </Badge>
                      </div>
                      <p className="font-semibold line-clamp-1">{s.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {cat?.emoji} {cat?.name ?? s.category} · {s.contestant}{" "}
                        · {s.city}
                      </p>
                      <div className="flex items-center justify-between text-xs">
                        {s.score ? (
                          <Badge variant="gradient" className="text-[10px]">
                            {s.score.total}/100 · {s.score.judges}j
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">unscored</span>
                        )}
                        <span className="text-muted-foreground">
                          {new Date(s.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function badgeForStatus(
  s: Row["status"]
): "secondary" | "outline" | "gradient" | "default" {
  switch (s) {
    case "approved":
      return "gradient";
    case "pending":
      return "outline";
    case "rejected":
    case "flagged":
    case "superseded":
      return "secondary";
  }
}
