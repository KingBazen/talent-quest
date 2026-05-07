"use client";

import * as React from "react";
import Link from "next/link";
import { Heart, Users, Loader2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, ApiError } from "@/lib/client-api";
import { TALENT_CATEGORIES } from "@/data/categories";

interface DirectoryItem {
  id: string;
  displayName: string;
  city: string;
  category: string;
  status: string;
  likes: number;
  followers: number;
}

export default function ContestantsDirectoryPage() {
  const [items, setItems] = React.useState<DirectoryItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [category, setCategory] = React.useState<string>("");
  const [city, setCity] = React.useState("");
  const [q, setQ] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      if (city.trim()) params.set("city", city.trim());
      if (q.trim()) params.set("q", q.trim());
      const r = await api.get<{ items: DirectoryItem[] }>(
        `/api/contestants?${params}`
      );
      setItems(r.items);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [category, city, q]);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="container py-12 md:py-16 max-w-6xl">
      <Badge variant="outline" className="mb-3">Contestants</Badge>
      <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight">
        Cheer them <span className="gradient-text">on</span>.
      </h1>
      <p className="mt-3 text-muted-foreground text-lg max-w-2xl">
        Public profiles of every contestant with at least one approved
        audition. Like, follow, and comment to back the artists you believe in.
      </p>

      <div className="mt-8 grid sm:grid-cols-[1fr_180px_180px] gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search stage name…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
        <Input
          placeholder="City"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-11 rounded-lg border border-input bg-background px-3 text-sm"
        >
          <option value="">All categories</option>
          {TALENT_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="mt-6 rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="mt-8">
        {loading ? (
          <div className="text-center py-20">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-border/60 bg-card p-12 text-center">
            <p className="text-muted-foreground">
              No contestants match those filters yet. Try a broader search, or
              come back once more auditions land.
            </p>
            <Button asChild variant="ghost" size="sm" className="mt-4">
              <Link href="/register">Apply yourself</Link>
            </Button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((it) => (
              <Link
                key={it.id}
                href={`/contestants/${it.id}`}
                className="rounded-2xl border border-border/60 bg-card p-5 hover:border-brand-500/50 hover:bg-card/80 transition-colors block"
              >
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-white font-bold flex items-center justify-center">
                    {it.displayName[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{it.displayName}</p>
                    <p className="text-xs text-muted-foreground">
                      {it.city} · {it.category}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Heart className="h-3.5 w-3.5 text-rose-500" />
                    {it.likes.toLocaleString()}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-brand-500" />
                    {it.followers.toLocaleString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
