"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, Trophy, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/components/auth/SessionProvider";
import { AdminSubNav } from "@/components/admin/SubNav";
import { TALENT_CATEGORIES } from "@/data/categories";
import { api, ApiError } from "@/lib/client-api";

interface ContestantRow {
  id: string;
  fullName: string;
  city: string;
  category: string;
  scoreTotal: number | null;
  judges: number;
}

interface Resp {
  counts: Record<string, number>;
  list: ContestantRow[];
  total: number;
}

const FROM_OPTIONS = [
  "registered",
  "submitted",
  "shortlisted",
  "advanced",
] as const;

const TO_OPTIONS = ["shortlisted", "advanced", "eliminated"] as const;

export default function AdminResultsPage() {
  const { user, loading: sessionLoading } = useSession();
  const [data, setData] = React.useState<Resp | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const [fromStatus, setFromStatus] =
    React.useState<(typeof FROM_OPTIONS)[number]>("submitted");
  const [toStatus, setToStatus] =
    React.useState<(typeof TO_OPTIONS)[number]>("shortlisted");
  const [reason, setReason] = React.useState("");
  const [picked, setPicked] = React.useState<Set<string>>(new Set());
  const [minScore, setMinScore] = React.useState(70);
  const [result, setResult] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setError(null);
    try {
      const r = await api.get<Resp>(`/api/admin/results?status=${fromStatus}`);
      setData(r);
      setPicked(new Set());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load");
    }
  }, [fromStatus]);

  React.useEffect(() => {
    if (!sessionLoading && user?.role === "admin") void load();
  }, [load, sessionLoading, user]);

  if (sessionLoading || (!data && !error)) {
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
  if (!data) {
    return (
      <div className="container py-20 max-w-xl text-center">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  function togglePick(id: string) {
    setPicked((p) => {
      const next = new Set(p);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function pickEligible() {
    if (!data) return;
    const eligible = new Set(
      data.list
        .filter((c) => (c.scoreTotal ?? 0) >= minScore && c.judges >= 3)
        .map((c) => c.id)
    );
    setPicked(eligible);
  }
  function clearPick() {
    setPicked(new Set());
  }

  async function publish() {
    if (picked.size === 0) {
      setError("Pick at least one contestant first.");
      return;
    }
    if (reason.trim().length < 4) {
      setError("Reason must be at least 4 characters.");
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const r = await api.post<{
        updated: number;
        skipped: { id: string; reason: string }[];
      }>("/api/admin/results", {
        contestantIds: Array.from(picked),
        status: toStatus,
        reason: reason.trim(),
      });
      setResult(
        `Updated ${r.updated} contestants${
          r.skipped.length ? `, skipped ${r.skipped.length}` : ""
        }.`
      );
      setReason("");
      setPicked(new Set());
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Publish failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container py-10 md:py-14 space-y-6 max-w-5xl">
      <AdminSubNav />

      <div>
        <Badge variant="outline" className="mb-2">Admin · Results</Badge>
        <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
          Publish a <span className="gradient-text">round</span>.
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Move contestants in bulk. Each move writes one audit-log row per
          contestant with the before / after status and your reason.
        </p>
      </div>

      <div className="grid sm:grid-cols-5 gap-3">
        {(["registered", "submitted", "shortlisted", "advanced", "eliminated"] as const).map(
          (s) => (
            <div
              key={s}
              className="rounded-xl border border-border/60 bg-card p-3 text-center"
            >
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {s}
              </p>
              <p className="font-display text-2xl font-bold mt-0.5">
                {data.counts[s] ?? 0}
              </p>
            </div>
          )
        )}
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-4 grid sm:grid-cols-3 gap-3 items-end">
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wider">Source</Label>
          <select
            value={fromStatus}
            onChange={(e) =>
              setFromStatus(e.target.value as (typeof FROM_OPTIONS)[number])
            }
            className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
          >
            {FROM_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s} ({data.counts[s] ?? 0})
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wider">→ Target</Label>
          <select
            value={toStatus}
            onChange={(e) =>
              setToStatus(e.target.value as (typeof TO_OPTIONS)[number])
            }
            className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
          >
            {TO_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wider">
            Auto-pick min score (≥3 judges)
          </Label>
          <div className="flex gap-2">
            <input
              type="number"
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="h-11 w-20 rounded-lg border border-input bg-background px-3 text-sm"
            />
            <Button variant="outline" size="sm" onClick={pickEligible}>
              Pick
            </Button>
            <Button variant="ghost" size="sm" onClick={clearPick}>
              Clear
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-4 md:p-6">
        <h3 className="font-semibold flex items-center gap-2 mb-3">
          <Trophy className="h-4 w-4 text-brand-500" />
          {data.total} contestants in &quot;{fromStatus}&quot;
          <Badge variant="outline" className="ml-2">
            {picked.size} selected
          </Badge>
        </h3>
        {data.list.length === 0 ? (
          <p className="text-center text-muted-foreground py-6 text-sm">
            Nothing to publish from this status.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-muted-foreground border-b border-border/60">
                  <th className="py-2 px-2"></th>
                  <th className="py-2 px-2">ID</th>
                  <th className="py-2 px-2">Name</th>
                  <th className="py-2 px-2">Category</th>
                  <th className="py-2 px-2">City</th>
                  <th className="py-2 px-2">Score</th>
                  <th className="py-2 px-2">Judges</th>
                </tr>
              </thead>
              <tbody>
                {data.list.map((c) => {
                  const cat = TALENT_CATEGORIES.find((x) => x.id === c.category);
                  const checked = picked.has(c.id);
                  return (
                    <tr
                      key={c.id}
                      className={`border-b border-border/40 cursor-pointer hover:bg-muted/40 ${
                        checked ? "bg-brand-500/5" : ""
                      }`}
                      onClick={() => togglePick(c.id)}
                    >
                      <td className="py-2 px-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePick(c.id)}
                          aria-label={`Select ${c.fullName}`}
                        />
                      </td>
                      <td className="py-2 px-2 font-mono">{c.id}</td>
                      <td className="py-2 px-2 font-medium">{c.fullName}</td>
                      <td className="py-2 px-2">
                        {cat?.emoji} {cat?.name ?? c.category}
                      </td>
                      <td className="py-2 px-2 text-muted-foreground">
                        {c.city}
                      </td>
                      <td className="py-2 px-2 font-mono">
                        {c.scoreTotal != null ? c.scoreTotal : "—"}
                      </td>
                      <td className="py-2 px-2 text-muted-foreground">
                        {c.judges}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Publish controls */}
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 space-y-3">
        <p className="text-sm">
          <strong>Confirm + reason</strong> — required for the audit log.
        </p>
        <Textarea
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Round 1 shortlist — 5-criterion total ≥ 70 with at least 3 referee scores."
        />
        {result && <p className="text-sm text-emerald-500">{result}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end">
          <Button
            variant="gradient"
            disabled={
              busy ||
              picked.size === 0 ||
              reason.trim().length < 4 ||
              fromStatus === toStatus
            }
            onClick={publish}
          >
            {busy
              ? "Publishing…"
              : `Move ${picked.size} → ${toStatus}`}
            <Send className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
