"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowRight,
  Trash2,
  Upload,
  Star,
  Calendar,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { demoStore } from "@/lib/storage";
import type { DemoContestant } from "@/types";
import { TALENT_CATEGORIES } from "@/data/categories";
import { JUDGING_CRITERIA, SCHEDULE } from "@/data/judging";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
  const [contestant, setContestant] = React.useState<DemoContestant | null>(null);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    setContestant(demoStore.getCurrent());
    setLoaded(true);
  }, []);

  if (!loaded) return null;

  if (!contestant) {
    return (
      <div className="container py-20 max-w-xl text-center">
        <Badge variant="outline" className="mb-3">No active session</Badge>
        <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
          You haven't registered yet.
        </h1>
        <p className="mt-3 text-muted-foreground">
          Phase 1 stores your demo profile in your browser's localStorage. Once
          you register, this page becomes your control panel.
        </p>
        <Button asChild variant="gradient" size="lg" className="mt-6">
          <Link href="/register">Register now</Link>
        </Button>
      </div>
    );
  }

  const cat = TALENT_CATEGORIES.find((c) => c.id === contestant.category);
  const completed = contestant.progress.filter((p) => p.done).length;
  const pct = (completed / contestant.progress.length) * 100;

  function clearDemo() {
    if (
      confirm(
        "This will erase your demo profile and contestant ID from this browser. Continue?"
      )
    ) {
      demoStore.clear();
      setContestant(null);
    }
  }

  function simulateNextStep() {
    const next = contestant!.progress.find((p) => !p.done);
    if (!next) return;
    next.done = true;
    next.date = new Date().toISOString();
    const updated: DemoContestant = { ...contestant! };
    if (next.key === "video_submitted") updated.status = "submitted";
    if (next.key === "shortlisted") updated.status = "shortlisted";
    if (next.key === "result")
      updated.status = Math.random() > 0.5 ? "advanced" : "eliminated";
    demoStore.saveContestant(updated);
    setContestant(updated);
  }

  return (
    <div className="container py-10 md:py-14 space-y-8">
      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20 ring-4 ring-brand-500/30">
            <AvatarFallback className="bg-gradient-to-br from-brand-500 to-fuchsia-500 text-white text-2xl">
              {contestant.fullName
                .split(" ")
                .map((p) => p[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <Badge variant="gradient" className="mb-1">
              <Sparkles className="h-3 w-3 mr-1" />
              Demo profile
            </Badge>
            <h1 className="font-display text-2xl md:text-4xl font-bold tracking-tight">
              {contestant.stageName || contestant.fullName}
            </h1>
            <p className="text-sm text-muted-foreground">
              {cat?.emoji} {cat?.name} · {contestant.city} · age {contestant.age}
            </p>
            <p className="font-mono text-sm mt-1">
              ID: <span className="gradient-text font-bold">{contestant.id}</span>
            </p>
          </div>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={clearDemo}>
            <Trash2 className="h-4 w-4 mr-1.5" /> Clear demo
          </Button>
          <Button variant="gradient" size="sm" onClick={simulateNextStep}>
            <ArrowRight className="h-4 w-4 mr-1.5" /> Simulate next step
          </Button>
        </div>
      </div>

      <Tabs defaultValue="progress">
        <TabsList>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="submission">Submission</TabsTrigger>
          <TabsTrigger value="scores">Scores</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>

        <TabsContent value="progress">
          <div className="rounded-2xl border border-border/60 bg-card p-6 space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Round 1</p>
                <h3 className="font-display text-2xl font-bold">
                  {Math.round(pct)}% complete
                </h3>
              </div>
              <Badge
                variant={contestant.status === "advanced" ? "gradient" : "secondary"}
                className="capitalize"
              >
                {contestant.status}
              </Badge>
            </div>
            <Progress value={pct} />

            <ol className="relative border-l border-border/60 ml-3 mt-4 space-y-5">
              {contestant.progress.map((p, i) => (
                <li key={p.key} className="ml-6">
                  <span
                    className={cn(
                      "absolute -left-2 flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-background",
                      p.done
                        ? "bg-gradient-to-r from-brand-500 to-fuchsia-500"
                        : "bg-muted"
                    )}
                  >
                    {p.done ? (
                      <CheckCircle2 className="h-3 w-3 text-white" />
                    ) : (
                      <Clock className="h-2.5 w-2.5 text-muted-foreground" />
                    )}
                  </span>
                  <p className="font-semibold">{p.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.done && p.date
                      ? new Date(p.date).toLocaleString()
                      : "Pending"}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </TabsContent>

        <TabsContent value="submission">
          <div className="rounded-2xl border border-border/60 bg-card p-8 text-center">
            <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500/20 to-fuchsia-500/20 text-brand-500">
              <Upload className="h-6 w-6" />
            </div>
            <h3 className="font-display text-xl font-bold mt-4">
              Video upload — Phase 2
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2">
              Real upload to Cloudinary / Mux / S3 with chunked transfer,
              transcoding, and thumbnail generation will arrive in Phase 2. For
              now you can review the upload guide.
            </p>
            <Button asChild variant="gradient" className="mt-5">
              <Link href="/upload-guide">Read the upload guide</Link>
            </Button>
            <p className="text-[11px] text-muted-foreground mt-4">
              Phase 1 stub: clicking "Simulate next step" marks your video as
              submitted in localStorage so the rest of the flow demoes.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="scores">
          <div className="rounded-2xl border border-border/60 bg-card p-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Demo score preview</p>
                <h3 className="font-display text-2xl font-bold flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-gold-500" />
                  82 / 100
                </h3>
              </div>
              <Badge variant="gold">Above shortlist threshold</Badge>
            </div>

            <div className="mt-4 grid md:grid-cols-2 gap-3">
              {JUDGING_CRITERIA.map((c, i) => {
                const fake = [22, 21, 16, 12, 11][i];
                return (
                  <div
                    key={c.key}
                    className="rounded-xl border border-border/60 bg-background p-4"
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold">{c.label}</span>
                      <span>
                        {fake} / {c.weight}
                      </span>
                    </div>
                    <Progress className="mt-2" value={(fake / c.weight) * 100} />
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-[11px] text-muted-foreground">
              Demo scores are mocked. Phase 2: real judges submit scores via
              the referee dashboard, average is published per round.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="schedule">
          <div className="rounded-2xl border border-border/60 bg-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-brand-500" />
              <h3 className="font-display text-xl font-bold">Your schedule</h3>
            </div>
            <ol className="space-y-3">
              {SCHEDULE.map((s) => (
                <li
                  key={s.date}
                  className="flex items-center justify-between rounded-xl border border-border/60 bg-background px-4 py-3"
                >
                  <div>
                    <p className="font-semibold">{s.label}</p>
                    <p className="text-xs text-muted-foreground">{s.date}</p>
                  </div>
                  <Badge variant="outline">Phase 2</Badge>
                </li>
              ))}
            </ol>
          </div>
        </TabsContent>

        <TabsContent value="account">
          <div className="rounded-2xl border border-border/60 bg-card p-6 grid md:grid-cols-2 gap-4 text-sm">
            <Row k="Full name" v={contestant.fullName} />
            <Row k="Stage name" v={contestant.stageName || "—"} />
            <Row k="Email" v={contestant.email} />
            <Row k="Phone" v={contestant.phone} />
            <Row k="City" v={contestant.city} />
            <Row k="Age" v={String(contestant.age)} />
            <Row k="Category" v={cat?.name || "—"} />
            <Row k="Experience" v={contestant.experience} />
            <Row
              k="Registered"
              v={new Date(contestant.createdAt).toLocaleString()}
            />
            <Row k="Status" v={contestant.status} />
          </div>
          <p className="mt-4 text-[11px] text-muted-foreground">
            All values stored only in this browser's localStorage. Phase 2
            replaces this with authenticated PostgreSQL records and audited
            edits.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-background px-3 py-2">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium text-right">{v}</span>
    </div>
  );
}
