"use client";

import * as React from "react";
import {
  Users,
  Video,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  Award,
  Search,
  Loader2,
  CreditCard,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { TALENT_CATEGORIES } from "@/data/categories";
import { api, ApiError } from "@/lib/client-api";
import { useSession } from "@/components/auth/SessionProvider";
import { AdminSubNav } from "@/components/admin/SubNav";

interface Stats {
  contestants: { total: number; weeklyDelta: number };
  submissions: { total: number; reviewed: number };
  avgScore: number;
  payments: { grossCents: number; paid: number; pending: number };
  categoryDistribution: { category: string; count: number; pct: number }[];
}

interface ContestantRow {
  id: string;
  fullName: string;
  email: string;
  city: string;
  category: string;
  status: string;
  score: number | null;
  createdAt: string;
}

export default function AdminPage() {
  const { user, loading: sessionLoading } = useSession();
  const [stats, setStats] = React.useState<Stats | null>(null);
  const [contestants, setContestants] = React.useState<ContestantRow[]>([]);
  const [search, setSearch] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const [s, c] = await Promise.all([
        api.get<Stats>("/api/admin/stats"),
        api.get<{ items: ContestantRow[] }>(
          `/api/admin/contestants?q=${encodeURIComponent(search)}`
        ),
      ]);
      setStats(s);
      setContestants(c.items);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load");
    }
  }, [search]);

  React.useEffect(() => {
    if (!sessionLoading && user?.role === "admin") void load();
  }, [load, sessionLoading, user]);

  if (sessionLoading || (!stats && !error)) {
    return (
      <div className="container py-20 text-center">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-20 text-center">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  const STATS = stats
    ? [
        {
          label: "Total contestants",
          value: stats.contestants.total.toLocaleString(),
          trend: `+${stats.contestants.weeklyDelta} this week`,
          icon: Users,
        },
        {
          label: "Videos submitted",
          value: stats.submissions.total.toLocaleString(),
          trend:
            stats.contestants.total > 0
              ? `${Math.round(
                  (stats.submissions.total / stats.contestants.total) * 100
                )}% of registrants`
              : "—",
          icon: Video,
        },
        {
          label: "Reviewed",
          value: stats.submissions.reviewed.toLocaleString(),
          trend:
            stats.submissions.total > 0
              ? `${Math.round(
                  (stats.submissions.reviewed / stats.submissions.total) * 100
                )}% of submissions`
              : "—",
          icon: CheckCircle2,
        },
        {
          label: "Avg score",
          value: stats.avgScore ? `${stats.avgScore} / 100` : "—",
          trend: "Live across all rounds",
          icon: Award,
        },
      ]
    : [];

  return (
    <div className="container py-10 md:py-14 space-y-6">
      <AdminSubNav />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Badge variant="outline" className="mb-2">Admin console</Badge>
          <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
            Mission control for the <span className="gradient-text">whole season</span>.
          </h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border/60 bg-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <s.icon className="h-4 w-4 text-brand-500" />
            </div>
            <p className="font-display text-3xl font-bold mt-2">{s.value}</p>
            <p className="text-xs text-emerald-500 mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {s.trend}
            </p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="contestants">
        <TabsList>
          <TabsTrigger value="contestants">Contestants</TabsTrigger>
          <TabsTrigger value="categories">Category mix</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="contestants">
          <div className="rounded-2xl border border-border/60 bg-card p-4 md:p-6">
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <h3 className="font-semibold">Recent registrations</h3>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9 h-9"
                  placeholder="Search by name, ID, city, email"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
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
                  </tr>
                </thead>
                <tbody>
                  {contestants.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-muted-foreground">
                        No contestants match your filter.
                      </td>
                    </tr>
                  ) : (
                    contestants.map((c) => {
                      const cat = TALENT_CATEGORIES.find(
                        (x) => x.id === c.category
                      );
                      return (
                        <tr
                          key={c.id}
                          className="border-b border-border/40 hover:bg-muted/40"
                        >
                          <td className="py-2 px-2 font-mono">{c.id}</td>
                          <td className="py-2 px-2 font-medium">{c.fullName}</td>
                          <td className="py-2 px-2 text-muted-foreground">{c.email}</td>
                          <td className="py-2 px-2">
                            {cat?.emoji} {cat?.name || c.category}
                          </td>
                          <td className="py-2 px-2 text-muted-foreground">{c.city}</td>
                          <td className="py-2 px-2">
                            <Badge
                              variant={
                                c.status === "advanced" || c.status === "shortlisted"
                                  ? "gradient"
                                  : "secondary"
                              }
                              className="capitalize"
                            >
                              {c.status}
                            </Badge>
                          </td>
                          <td className="py-2 px-2">
                            {c.score == null ? "—" : `${c.score}/100`}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="categories">
          <div className="rounded-2xl border border-border/60 bg-card p-6">
            <h3 className="font-semibold mb-4">Distribution across categories</h3>
            <div className="space-y-3">
              {stats?.categoryDistribution?.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No data yet — once contestants register, the distribution
                  appears here.
                </p>
              )}
              {stats?.categoryDistribution?.map((c) => {
                const meta = TALENT_CATEGORIES.find((x) => x.id === c.category);
                return (
                  <div key={c.category}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span>
                        {meta?.emoji} {meta?.name || c.category}
                      </span>
                      <span className="text-muted-foreground">
                        {c.count} ({c.pct}%)
                      </span>
                    </div>
                    <Progress value={c.pct} />
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="payments">
          <div className="rounded-2xl border border-border/60 bg-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <CreditCard className="h-5 w-5 text-brand-500" />
              <h3 className="font-display text-xl font-bold">Payments</h3>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="rounded-xl border border-border/60 bg-background p-4">
                <p className="text-xs text-muted-foreground">Gross</p>
                <p className="font-display text-2xl font-bold mt-1">
                  ETB {((stats?.payments.grossCents ?? 0) / 100).toLocaleString()}
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-background p-4">
                <p className="text-xs text-muted-foreground">Paid</p>
                <p className="font-display text-2xl font-bold mt-1">
                  {stats?.payments.paid ?? 0}
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-background p-4">
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="font-display text-2xl font-bold mt-1">
                  {stats?.payments.pending ?? 0}
                </p>
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Telebirr / AdmasPay integration runs in hosted-checkout mode when
              <code className="mx-1 rounded bg-muted px-1">ADMASPAY_CHECKOUT_URL</code>
              is set, or full-API mode when all <code>TELEBIRR_*</code> env vars
              are configured. Otherwise <code>/api/payments/init</code> returns
              a 500 with a clear configuration error.
            </p>
            <div className="mt-4">
              <Button asChild variant="outline" size="sm">
                <a href="/admin/payments">
                  Open payments console <span aria-hidden="true">→</span>
                </a>
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
