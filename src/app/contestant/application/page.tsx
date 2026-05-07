"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useSession } from "@/components/auth/SessionProvider";
import { ContestantSubNav } from "@/components/contestant/SubNav";
import { TALENT_CATEGORIES } from "@/data/categories";
import { statusCopy } from "@/lib/status-copy";
import { cn } from "@/lib/utils";

export default function ContestantApplicationPage() {
  const { user, contestant, loading } = useSession();

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
          Sign in to view your application.
        </h1>
        <Button asChild variant="gradient" size="lg" className="mt-6">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  const cat = TALENT_CATEGORIES.find((c) => c.id === contestant.category);
  const completed = contestant.progress.filter((p) => p.done).length;
  const pct = (completed / contestant.progress.length) * 100;
  const copy = statusCopy(contestant.status);

  return (
    <div className="container py-10 md:py-14 max-w-3xl">
      <ContestantSubNav />

      <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">
        Your <span className="gradient-text">application</span>.
      </h1>
      <p className="mt-2 text-muted-foreground">
        ID <span className="font-mono">{contestant.id}</span> · {cat?.name} ·
        Registered{" "}
        {new Date(contestant.createdAt).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
      </p>

      <div className="mt-8 rounded-2xl border border-border/60 bg-card p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Round 1</p>
            <h2 className="font-display text-2xl font-bold">
              {Math.round(pct)}% complete
            </h2>
          </div>
          <Badge variant={copy.badge}>{copy.label}</Badge>
        </div>
        <Progress value={pct} />
        <p className="text-sm text-muted-foreground">{copy.description}</p>
        <p className="text-xs font-semibold text-brand-500">
          Next: {copy.nextStep}
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-border/60 bg-card p-6">
        <h3 className="font-display text-xl font-bold">Pipeline</h3>
        <ol className="relative border-l border-border/60 ml-3 mt-4 space-y-5">
          {contestant.progress.map((p) => (
            <li key={p.key} className="ml-6">
              <span
                className={cn(
                  "absolute -left-2 flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-background",
                  p.done
                    ? "bg-gradient-to-r from-brand-400 to-brand-600"
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

      <div className="mt-8 rounded-2xl border border-border/60 bg-card p-6">
        <h3 className="font-display text-xl font-bold">Application data</h3>
        <dl className="mt-4 grid sm:grid-cols-2 gap-3 text-sm">
          <Row k="Stage name" v={contestant.stageName ?? "—"} />
          <Row k="Phone" v={contestant.phone} />
          <Row k="DOB" v={contestant.dob ?? "—"} />
          <Row k="Age" v={String(contestant.age)} />
          <Row k="City" v={contestant.city} />
          <Row k="Country" v={contestant.country} />
          <Row k="Experience" v={contestant.experience} />
          <Row k="Instagram" v={contestant.socialIg ?? "—"} />
          <Row k="TikTok" v={contestant.socialTt ?? "—"} />
          <Row k="YouTube" v={contestant.socialYt ?? "—"} />
        </dl>

        <p className="mt-6 text-xs text-muted-foreground">
          Bio: {contestant.bio}
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button asChild variant="gradient">
          <Link href="/contestant/profile">Edit profile</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/contestant/dashboard">Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-background px-3 py-2">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium text-right break-all">{v}</span>
    </div>
  );
}
