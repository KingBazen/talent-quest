"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, Users, Search, Filter } from "lucide-react";
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
  fullName: string;
  email: string;
  city: string;
  category: string;
  status: string;
  score: number | null;
  createdAt: string;
}

const STATUS_OPTIONS = [
  "registered",
  "submitted",
  "shortlisted",
  "advanced",
  "eliminated",
] as const;

export default function AdminContestantsListPage() {
  const { user, loading: sessionLoading } = useSession();
  const [items, setItems] = React.useState<Row[]>([]);
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
      qs.set("limit", "200");
      const r = await api.get<{ items: Row[] }>(
        `/api/admin/contestants?${qs}`
      );
      setItems(r.items);
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
          <Badge variant="outline" className="mb-2">Admin · Contestants</Badge>
          <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
            <span className="gradient-text">Roster</span> + filters.
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
            placeholder="Name, email, contestant ID, city…"
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
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-brand-500" />
            {items.length.toLocaleString()} contestants
          </h3>
        </div>
        {loading ? (
          <div className="text-center text-muted-foreground py-10">
            <Loader2 className="h-5 w-5 animate-spin mx-auto" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-center text-muted-foreground py-10">
            No contestants match those filters.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-muted-foreground border-b border-border/60">
                  <th className="py-2 px-2">ID</th>
                  <th className="py-2 px-2">Name</th>
                  <th className="py-2 px-2">Email</th>
                  <th className="py-2 px-2">Category</th>
                  <th className="py-2 px-2">City</th>
                  <th className="py-2 px-2">Status</th>
                  <th className="py-2 px-2">Score</th>
                  <th className="py-2 px-2"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => {
                  const cat = TALENT_CATEGORIES.find((x) => x.id === c.category);
                  return (
                    <tr
                      key={c.id}
                      className="border-b border-border/40 hover:bg-muted/40"
                    >
                      <td className="py-2 px-2 font-mono">{c.id}</td>
                      <td className="py-2 px-2 font-medium">{c.fullName}</td>
                      <td className="py-2 px-2 text-muted-foreground text-xs">
                        {c.email}
                      </td>
                      <td className="py-2 px-2">
                        {cat?.emoji} {cat?.name ?? c.category}
                      </td>
                      <td className="py-2 px-2 text-muted-foreground">
                        {c.city}
                      </td>
                      <td className="py-2 px-2">
                        <Badge
                          variant={badgeForStatus(c.status)}
                          className="capitalize"
                        >
                          {c.status}
                        </Badge>
                      </td>
                      <td className="py-2 px-2">
                        {c.score == null ? "—" : `${c.score}/100`}
                      </td>
                      <td className="py-2 px-2 text-right">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/admin/contestants/${c.id}`}>Open</Link>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function badgeForStatus(
  s: string
): "secondary" | "outline" | "gradient" | "default" {
  switch (s) {
    case "shortlisted":
    case "advanced":
      return "gradient";
    case "registered":
    case "submitted":
      return "outline";
    case "eliminated":
      return "secondary";
    default:
      return "outline";
  }
}
