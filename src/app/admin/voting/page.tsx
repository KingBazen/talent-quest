"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, Vote, ShieldAlert, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "@/components/auth/SessionProvider";
import { AdminSubNav } from "@/components/admin/SubNav";
import { api, ApiError } from "@/lib/client-api";

interface LeaderboardItem {
  contestantId: string;
  displayName: string;
  category: string;
  city: string;
  votes: number;
}

interface CategoryTally {
  category: string;
  votes: number;
}

interface SuspiciousIp {
  ipHash: string;
  votes: number;
  firstSeen: string;
  lastSeen: string;
}

interface VotingData {
  round: number;
  votingOpen: boolean;
  suspiciousThreshold: number;
  items: LeaderboardItem[];
  byCategory: CategoryTally[];
  suspicious: SuspiciousIp[];
}

export default function AdminVotingPage() {
  const { user, loading: sessionLoading } = useSession();
  const [data, setData] = React.useState<VotingData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [roundInput, setRoundInput] = React.useState(1);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.get<VotingData>("/api/admin/voting");
      setData(r);
      setRoundInput(r.round);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!sessionLoading && user?.role === "admin") void load();
  }, [load, sessionLoading, user]);

  async function patchSettings(patch: {
    voting_open?: boolean;
    voting_round?: number;
  }) {
    setSaving(true);
    setError(null);
    try {
      await api.patch("/api/admin/settings", patch);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

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

  const totalVotes =
    data?.byCategory.reduce((a, b) => a + b.votes, 0) ?? 0;

  return (
    <div className="container py-10 md:py-14 space-y-6 max-w-5xl">
      <AdminSubNav />

      <div>
        <Badge variant="outline" className="mb-2">Admin · Voting</Badge>
        <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
          Run the <span className="gradient-text">fan vote</span>.
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Open and close the voting window per round. Fan vote is independent
          of the panel score — it doesn&apos;t decide round progression. Use it as
          a popularity signal and a sanity-check on the panel.
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="rounded-2xl border border-border/60 bg-card p-5 grid sm:grid-cols-3 gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Voting state
          </p>
          <div className="mt-2 flex items-center gap-3">
            <Badge variant={data?.votingOpen ? "default" : "outline"}>
              Round {data?.round ?? "—"} · {data?.votingOpen ? "open" : "closed"}
            </Badge>
            <Button
              size="sm"
              variant={data?.votingOpen ? "outline" : "gradient"}
              disabled={saving || loading}
              onClick={() => patchSettings({ voting_open: !data?.votingOpen })}
            >
              {data?.votingOpen ? "Close voting" : "Open voting"}
            </Button>
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Round number
          </p>
          <div className="mt-2 flex items-center gap-2">
            <Input
              type="number"
              min={1}
              max={99}
              value={roundInput}
              onChange={(e) => setRoundInput(Number(e.target.value))}
              className="h-9 w-24"
            />
            <Button
              size="sm"
              variant="outline"
              disabled={saving || roundInput === data?.round}
              onClick={() => patchSettings({ voting_round: roundInput })}
            >
              Set round
            </Button>
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Total this round
          </p>
          <p className="mt-2 font-display text-2xl font-bold tabular-nums">
            {totalVotes.toLocaleString()}
          </p>
        </div>
      </div>

      {data && data.byCategory.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Vote className="h-4 w-4 text-brand-500" /> By category
          </h3>
          <div className="grid sm:grid-cols-3 gap-3">
            {data.byCategory.map((c) => (
              <div
                key={c.category}
                className="rounded-lg border border-border/60 bg-background p-3 flex items-center justify-between"
              >
                <span className="text-sm">{c.category}</span>
                <span className="font-bold tabular-nums">
                  {c.votes.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border/60 bg-card p-5">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" /> Top contestants
        </h3>
        {loading ? (
          <div className="text-center py-10">
            <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
          </div>
        ) : !data || data.items.length === 0 ? (
          <p className="text-center text-muted-foreground py-10">
            No votes yet for round {data?.round ?? "—"}.
          </p>
        ) : (
          <ol className="space-y-2">
            {data.items.slice(0, 50).map((it, i) => (
              <li
                key={it.contestantId}
                className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border/60 bg-background"
              >
                <span className="text-xs text-muted-foreground tabular-nums w-6">
                  {i + 1}
                </span>
                <Link
                  href={`/admin/contestants/${it.contestantId}`}
                  className="flex-1 min-w-0 text-sm hover:text-brand-500"
                >
                  {it.displayName} · {it.category} · {it.city}
                </Link>
                <span className="font-bold tabular-nums text-sm">
                  {it.votes.toLocaleString()}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
        <h3 className="font-semibold mb-3 flex items-center gap-2 text-amber-300">
          <ShieldAlert className="h-4 w-4" /> Suspicious IP cluster report
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          IPs that have cast more than one vote in this round, sorted by
          count. Auto-flag threshold:{" "}
          <span className="font-mono">
            {data?.suspiciousThreshold ?? "—"} votes
          </span>{" "}
          → writes an audit row + a moderation_action when crossed.
        </p>
        {!data || data.suspicious.length === 0 ? (
          <p className="text-center text-muted-foreground py-6">
            No clustered IPs. Healthy.
          </p>
        ) : (
          <table className="w-full text-xs">
            <thead className="text-muted-foreground">
              <tr>
                <th className="text-left py-2">IP hash</th>
                <th className="text-right py-2">Votes</th>
                <th className="text-right py-2">First seen</th>
                <th className="text-right py-2">Last seen</th>
              </tr>
            </thead>
            <tbody>
              {data.suspicious.slice(0, 50).map((s) => (
                <tr
                  key={s.ipHash}
                  className={
                    s.votes >= data.suspiciousThreshold
                      ? "text-amber-300"
                      : "text-muted-foreground"
                  }
                >
                  <td className="font-mono py-1">{s.ipHash.slice(0, 12)}…</td>
                  <td className="text-right tabular-nums py-1">{s.votes}</td>
                  <td className="text-right py-1">
                    {new Date(s.firstSeen).toLocaleString()}
                  </td>
                  <td className="text-right py-1">
                    {new Date(s.lastSeen).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
