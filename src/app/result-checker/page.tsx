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
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiError } from "@/lib/client-api";
import { useSession } from "@/components/auth/SessionProvider";
import type { PublicContestantDTO } from "@/lib/dto-types";
import { TALENT_CATEGORIES } from "@/data/categories";
import { statusCopy } from "@/lib/status-copy";

interface CheckResponse {
  contestant: PublicContestantDTO;
  score: { total: number; judges: number } | null;
}

export default function ResultCheckerPage() {
  const { contestant: me } = useSession();
  const [id, setId] = React.useState("");
  const [result, setResult] = React.useState<CheckResponse | null>(null);
  const [searched, setSearched] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function check(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(id)) {
      setError("Enter a 6-digit ID");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const data = await api.get<CheckResponse>(`/api/contestants/${id}`);
      setResult(data);
    } catch (e) {
      setResult(null);
      setError(
        e instanceof ApiError ? e.message : "Lookup failed — try again"
      );
    } finally {
      setSearched(true);
      setLoading(false);
    }
  }

  function tryMine() {
    if (me) {
      setId(me.id);
      // auto-submit
      setTimeout(() => {
        document.getElementById("result-form")?.dispatchEvent(
          new Event("submit", { cancelable: true, bubbles: true })
        );
      }, 0);
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
        Type your 6-digit contestant ID. We&apos;ll show your status, current
        score, and next step in the bracket.
      </p>

      <form
        id="result-form"
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
          <Button type="submit" variant="gradient" disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Search className="h-4 w-4 mr-1.5" />
                Check
              </>
            )}
          </Button>
        </div>
        {me && (
          <button
            type="button"
            onClick={tryMine}
            className="mt-3 text-xs text-muted-foreground underline hover:text-foreground"
          >
            Use my ID ({me.id})
          </button>
        )}
        {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
      </form>

      {searched && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8"
        >
          {result ? (
            <ResultCard result={result} />
          ) : !error ? (
            <NotFound id={id} />
          ) : null}
        </motion.div>
      )}
    </div>
  );
}

function ResultCard({ result }: { result: CheckResponse }) {
  const { contestant, score } = result;
  const cat = TALENT_CATEGORIES.find((c) => c.id === contestant.category);
  const completed = contestant.progress.filter((p) => p.done).length;
  const copy = statusCopy(contestant.status);
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Trophy className="h-6 w-6 text-gold-500" />
        <h2 className="font-display text-2xl font-bold">
          {contestant.displayName}
        </h2>
        <Badge variant={copy.badge}>{copy.label}</Badge>
      </div>
      <p className="text-muted-foreground mt-1">
        ID <span className="font-mono">{contestant.id}</span> · {cat?.name} ·{" "}
        {contestant.city}
      </p>

      <p className="mt-4 text-sm text-muted-foreground">{copy.description}</p>

      <div className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-brand-500">
        Next: {copy.nextStep}
      </div>

      <div className="mt-6 grid sm:grid-cols-2 gap-3 text-center">
        <Stat
          label="Stages cleared"
          value={`${completed}/${contestant.progress.length}`}
        />
        <Stat
          label="Score"
          value={score ? `${score.total} / 100` : "Awaiting judges"}
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
      <h2 className="mt-3 font-display text-2xl font-bold">No match found</h2>
      <p className="mt-2 text-muted-foreground max-w-md mx-auto">
        We couldn&apos;t find ID <span className="font-mono">{id || "—"}</span>.
        Either it doesn&apos;t exist or it hasn&apos;t finished registration
        yet.
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
