"use client";

import * as React from "react";
import Link from "next/link";
import {
  Users,
  Video,
  CheckCircle2,
  Clock,
  TrendingUp,
  Sparkles,
  Settings,
  Lock,
  Award,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TALENT_CATEGORIES } from "@/data/categories";
import { SHOWCASE_CLIPS } from "@/data/showcase";
import { Progress } from "@/components/ui/progress";

const STATS = [
  { label: "Total contestants", value: "2,461", trend: "+128 this week", icon: Users },
  { label: "Videos submitted", value: "1,832", trend: "74% of registrants", icon: Video },
  { label: "Reviewed", value: "1,420", trend: "77% of submissions", icon: CheckCircle2 },
  { label: "Avg score", value: "73 / 100", trend: "Round 1 average", icon: Award },
];

const FAKE_CONTESTANTS = [
  { id: "482910", name: "Hanna Tesfaye", cat: "singing", city: "Addis Ababa", status: "review", score: 86 },
  { id: "192304", name: "Selam Crew", cat: "dancing", city: "Lalibela", status: "shortlisted", score: 91 },
  { id: "771203", name: "Yonas Girma", cat: "instruments", city: "Bahir Dar", status: "submitted", score: 78 },
  { id: "320918", name: "Mikiyas L.", cat: "comedy", city: "Addis Ababa", status: "advanced", score: 88 },
  { id: "604711", name: "Ruth Abay", cat: "acting", city: "Hawassa", status: "review", score: 74 },
  { id: "550022", name: "Daniel Kifle", cat: "other", city: "Dire Dawa", status: "shortlisted", score: 82 },
];

export default function AdminDemoPage() {
  const [search, setSearch] = React.useState("");
  const filtered = FAKE_CONTESTANTS.filter((c) =>
    [c.id, c.name, c.cat, c.city].join(" ").toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div className="container py-10 md:py-14 space-y-8">
      <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 text-sm flex items-start gap-3">
        <Lock className="h-5 w-5 mt-0.5 text-amber-500" />
        <div>
          <p className="font-semibold">Admin portal — preview only</p>
          <p className="text-muted-foreground">
            Phase 1 renders this dashboard with mock data so stakeholders can
            see the future product. Phase 2 puts it behind authenticated, role-
            based access (admin only).
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Badge variant="outline" className="mb-2">Admin demo</Badge>
          <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
            Mission control for the <span className="gradient-text">whole season</span>.
          </h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-1.5" /> Settings
          </Button>
          <Button variant="gradient" size="sm">
            <Sparkles className="h-4 w-4 mr-1.5" /> Open round 2
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
          <TabsTrigger value="queue">Review queue</TabsTrigger>
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
                  placeholder="Search by name, ID, city"
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
                    <th className="py-2 px-2">Category</th>
                    <th className="py-2 px-2">City</th>
                    <th className="py-2 px-2">Status</th>
                    <th className="py-2 px-2">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => {
                    const cat = TALENT_CATEGORIES.find((x) => x.id === c.cat);
                    return (
                      <tr
                        key={c.id}
                        className="border-b border-border/40 hover:bg-muted/40"
                      >
                        <td className="py-2 px-2 font-mono">{c.id}</td>
                        <td className="py-2 px-2 font-medium">{c.name}</td>
                        <td className="py-2 px-2">
                          {cat?.emoji} {cat?.name}
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
                        <td className="py-2 px-2">{c.score}/100</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="queue">
          <div className="grid md:grid-cols-3 gap-4">
            {SHOWCASE_CLIPS.slice(0, 6).map((v) => (
              <div
                key={v.id}
                className="rounded-2xl border border-border/60 bg-card overflow-hidden"
              >
                <div
                  className="aspect-video bg-cover bg-center"
                  style={{ backgroundImage: `url(${v.thumbnail})` }}
                />
                <div className="p-4">
                  <p className="font-semibold text-sm truncate">{v.title}</p>
                  <p className="text-xs text-muted-foreground">{v.contestant}</p>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" variant="gradient" className="flex-1">
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      Flag
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="categories">
          <div className="rounded-2xl border border-border/60 bg-card p-6">
            <h3 className="font-semibold mb-4">Distribution across categories</h3>
            <div className="space-y-3">
              {TALENT_CATEGORIES.map((c, i) => {
                const pct = [28, 22, 14, 18, 12, 6][i];
                return (
                  <div key={c.id}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span>
                        {c.emoji} {c.name}
                      </span>
                      <span className="text-muted-foreground">{pct}%</span>
                    </div>
                    <Progress value={pct} />
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="payments">
          <div className="rounded-2xl border border-border/60 bg-card p-6 text-center">
            <Lock className="mx-auto h-10 w-10 text-amber-500" />
            <h3 className="font-display text-xl font-bold mt-3">Payments — Phase 2</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              Telebirr through AdmasPay/Paylib. Backend payment verification via
              callbacks/webhooks. Reconciliation, refunds, and audit log all
              live in Phase 2.
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/docs/PAYMENTS_TELEBIRR.md">
                Read the integration plan
              </Link>
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
