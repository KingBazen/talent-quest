"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, Gavel, Users, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "@/components/auth/SessionProvider";
import { AdminSubNav } from "@/components/admin/SubNav";
import { TALENT_CATEGORIES } from "@/data/categories";
import { api, ApiError } from "@/lib/client-api";

interface Submission {
  id: string;
  contestantId: string;
  title: string;
  contestant: string;
  category: string;
  status: string;
}

interface Referee {
  id: string;
  fullName: string;
  email: string;
  role: string;
}

interface Assignment {
  submission_id: string;
  referee_user_id: string;
  assigned_at: string;
}

export default function AdminAssignmentsPage() {
  const { user, loading: sessionLoading } = useSession();
  const [subs, setSubs] = React.useState<Submission[]>([]);
  const [referees, setReferees] = React.useState<Referee[]>([]);
  const [perSubAssignments, setPerSubAssignments] = React.useState<
    Record<string, Assignment[]>
  >({});
  const [activeSub, setActiveSub] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadSubs = React.useCallback(async () => {
    setError(null);
    try {
      const r = await api.get<{ items: Submission[] }>(
        "/api/admin/submissions?limit=100"
      );
      // Only items eligible for review.
      setSubs(r.items.filter((s) => s.status === "pending" || s.status === "approved"));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load submissions");
    }
  }, []);

  const loadReferees = React.useCallback(async () => {
    try {
      const r = await api.get<{ items: Referee[] }>("/api/admin/referees");
      setReferees(r.items);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load referees");
    }
  }, []);

  const loadAssignments = React.useCallback(
    async (submissionId: string) => {
      try {
        const r = await api.get<{ assignments: Assignment[] }>(
          `/api/admin/assignments?submissionId=${encodeURIComponent(submissionId)}`
        );
        setPerSubAssignments((prev) => ({
          ...prev,
          [submissionId]: r.assignments,
        }));
      } catch {
        /* non-fatal */
      }
    },
    []
  );

  React.useEffect(() => {
    if (!sessionLoading && user?.role === "admin") {
      void loadSubs();
      void loadReferees();
    }
  }, [sessionLoading, user, loadSubs, loadReferees]);

  React.useEffect(() => {
    // Lazy-load assignments for visible submissions on first render.
    for (const s of subs) {
      if (!perSubAssignments[s.id]) void loadAssignments(s.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subs]);

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

  const filtered = subs.filter((s) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      s.title.toLowerCase().includes(q) ||
      s.contestantId.toLowerCase().includes(q) ||
      s.contestant.toLowerCase().includes(q)
    );
  });

  async function assign(refereeUserId: string) {
    if (!activeSub) return;
    setBusy(true);
    setError(null);
    try {
      await api.post("/api/admin/assignments", {
        submissionId: activeSub,
        refereeUserIds: [refereeUserId],
      });
      await loadAssignments(activeSub);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Assign failed");
    } finally {
      setBusy(false);
    }
  }

  async function unassign(refereeUserId: string) {
    if (!activeSub) return;
    setBusy(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        submissionId: activeSub,
        refereeUserId,
      });
      await fetch(`/api/admin/assignments?${qs}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      await loadAssignments(activeSub);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Unassign failed");
    } finally {
      setBusy(false);
    }
  }

  const activeSubmission = subs.find((s) => s.id === activeSub);
  const activeAssignments =
    activeSub != null ? perSubAssignments[activeSub] ?? [] : [];
  const assignedIds = new Set(activeAssignments.map((a) => a.referee_user_id));

  return (
    <div className="container py-10 md:py-14 space-y-6">
      <AdminSubNav />

      <div>
        <Badge variant="outline" className="mb-2">Admin · Assignments</Badge>
        <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
          Route the <span className="gradient-text">queue</span>.
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Assign referees to specific submissions so the panel can balance load
          and avoid bias-pairings.
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="grid lg:grid-cols-[1fr_400px] gap-6">
        {/* Submission list */}
        <div className="rounded-2xl border border-border/60 bg-card p-4 md:p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">
              Active submissions ({filtered.length})
            </h3>
          </div>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by title or contestant ID…"
            className="mb-3"
          />
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-6 text-sm">
              No active submissions.
            </p>
          ) : (
            <ul className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {filtered.map((s) => {
                const cat = TALENT_CATEGORIES.find((c) => c.id === s.category);
                const assignedHere = perSubAssignments[s.id]?.length ?? 0;
                return (
                  <li key={s.id}>
                    <button
                      onClick={() => setActiveSub(s.id)}
                      className={`w-full text-left rounded-xl border px-3 py-2 transition-colors ${
                        activeSub === s.id
                          ? "border-brand-500 bg-brand-500/5"
                          : "border-border/60 bg-background hover:border-brand-500/50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-mono text-muted-foreground">
                          ID {s.contestantId}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {assignedHere} ref{assignedHere === 1 ? "" : "s"}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium line-clamp-1 mt-0.5">
                        {s.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground line-clamp-1">
                        {cat?.emoji} {cat?.name ?? s.category} · {s.contestant}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Right pane: referee assignment */}
        <div className="rounded-2xl border border-border/60 bg-card p-4 md:p-6 space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-brand-500" />
            Referees
          </h3>
          {!activeSubmission ? (
            <p className="text-sm text-muted-foreground">
              Pick a submission on the left to manage its referees.
            </p>
          ) : (
            <>
              <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-xs">
                <p className="font-mono font-semibold">{activeSubmission.id}</p>
                <p className="text-muted-foreground mt-0.5 line-clamp-1">
                  {activeSubmission.title}
                </p>
              </div>
              <ul className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                {referees.map((r) => {
                  const assigned = assignedIds.has(r.id);
                  return (
                    <li
                      key={r.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-background px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium line-clamp-1">
                          {r.fullName}
                          {r.role === "admin" && (
                            <Badge variant="outline" className="ml-2 text-[10px]">
                              admin
                            </Badge>
                          )}
                        </p>
                        <p className="text-[11px] text-muted-foreground line-clamp-1">
                          {r.email}
                        </p>
                      </div>
                      {assigned ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => unassign(r.id)}
                          disabled={busy}
                        >
                          <X className="h-3.5 w-3.5 mr-1" />
                          Remove
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => assign(r.id)}
                          disabled={busy}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Assign
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        <Gavel className="inline h-3 w-3 mr-1" />
        Referees only see submissions assigned to them. Admins see everything.
      </p>
    </div>
  );
}
