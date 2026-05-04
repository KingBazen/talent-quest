"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Search,
  Sparkles,
  CheckCircle2,
  XCircle,
  Trophy,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { demoStore } from "@/lib/storage";
import type { DemoContestant } from "@/types";
import { TALENT_CATEGORIES } from "@/data/categories";

export default function ResultCheckerPage() {
  const [id, setId] = React.useState("");
  const [result, setResult] = React.useState<DemoContestant | null>(null);
  const [searched, setSearched] = React.useState(false);

  function check(e: React.FormEvent) {
    e.preventDefault();
    const c = demoStore.getById(id.trim());
    setResult(c);
    setSearched(true);
  }

  function tryMine() {
    const me = demoStore.getCurrent();
    if (me) {
      setId(me.id);
      setResult(me);
      setSearched(true);
    }
  }

  return (
    <div className="container py-12 md:py-20 max-w-3xl">
      <Badge variant="outline" className="mb-3">
        Result checker
      </Badge>
      <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight">
        Did you make the <span className="gradient-text">cut</span>?
      </h1>
      <p className="mt-3 text-muted-foreground text-lg">
        Type your 6-digit demo contestant ID. We'll show your status, demo
        score breakdown, and next step in the bracket.
      </p>

      <form
        onSubmit={check}
        className="mt-8 rounded-2xl border border-border/60 bg-card p-6"
      >
        <Label className="text-sm font-semibold">Contestant ID</Label>
        <div className="mt-2 flex gap-2">
          <Input
            value={id}
            onChange={(e) => setId(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            maxLength={6}
            placeholder="e.g. 482910"
            className="font-mono tracking-widest text-lg"
          />
          <Button type="submit" variant="gradient">
            <Search className="h-4 w-4 mr-1.5" />
            Check
          </Button>
        </div>
        <button
          type="button"
          onClick={tryMine}
          className="mt-3 text-xs text-muted-foreground underline hover:text-foreground"
        >
          Use my demo ID
        </button>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Phase 1 only finds IDs you created in this browser. Phase 2 will look
          up across the official PostgreSQL database in real time.
        </p>
      </form>

      {searched && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8"
        >
          {result ? (
            <ResultCard contestant={result} />
          ) : (
            <NotFound id={id} />
          )}
        </motion.div>
      )}
    </div>
  );
}

function ResultCard({ contestant }: { contestant: DemoContestant }) {
  const cat = TALENT_CATEGORIES.find((c) => c.id === contestant.category);
  const completed = contestant.progress.filter((p) => p.done).length;
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Trophy className="h-6 w-6 text-gold-500" />
        <h2 className="font-display text-2xl font-bold">{contestant.fullName}</h2>
        <Badge
          variant={contestant.status === "advanced" ? "gradient" : "secondary"}
          className="capitalize"
        >
          {contestant.status}
        </Badge>
      </div>
      <p className="text-muted-foreground mt-1">
        ID <span className="font-mono">{contestant.id}</span> · {cat?.name} ·{" "}
        {contestant.city}
      </p>

      <div className="mt-6 grid sm:grid-cols-3 gap-3 text-center">
        <Stat label="Stages cleared" value={`${completed}/${contestant.progress.length}`} />
        <Stat label="Demo score" value="82 / 100" />
        <Stat
          label="Round"
          value={contestant.status === "registered" ? "Pre-submission" : "Round 1"}
        />
      </div>

      <ol className="mt-6 grid sm:grid-cols-2 gap-2">
        {contestant.progress.map((p) => (
          <li
            key={p.key}
            className="flex items-center gap-3 rounded-xl border border-border/60 bg-background px-4 py-3 text-sm"
          >
            {p.done ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : (
              <Clock className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="flex-1 font-medium">{p.label}</span>
            <span className="text-xs text-muted-foreground">
              {p.done && p.date ? new Date(p.date).toLocaleDateString() : "—"}
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button asChild variant="gradient">
          <Link href="/profile">Open profile</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/showcase">See showcase</Link>
        </Button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-display text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

function NotFound({ id }: { id: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6 text-center">
      <XCircle className="mx-auto h-10 w-10 text-rose-500" />
      <h2 className="mt-3 font-display text-2xl font-bold">No match in this browser</h2>
      <p className="mt-2 text-muted-foreground max-w-md mx-auto">
        We couldn't find ID <span className="font-mono">{id || "—"}</span> in
        this device's localStorage. Try registering first, or — in Phase 2 —
        any official ID will resolve here.
      </p>
      <div className="mt-5 flex justify-center gap-2">
        <Button asChild variant="gradient">
          <Link href="/register">
            Register <Sparkles className="h-4 w-4 ml-1.5" />
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/profile">Open profile</Link>
        </Button>
      </div>
    </div>
  );
}
