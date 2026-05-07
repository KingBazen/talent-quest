"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, ShieldAlert, EyeOff, Eye, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/components/auth/SessionProvider";
import { AdminSubNav } from "@/components/admin/SubNav";
import { api, ApiError } from "@/lib/client-api";

interface ModerationItem {
  id: string;
  contestantId: string;
  contestantDisplay: string;
  authorDisplay: string;
  body: string;
  status: "visible" | "hidden" | "removed";
  flagCount: number;
  createdAt: string;
}

export default function AdminModerationPage() {
  const { user, loading: sessionLoading } = useSession();
  const [items, setItems] = React.useState<ModerationItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [reasons, setReasons] = React.useState<Record<string, string>>({});
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.get<{ items: ModerationItem[] }>(
        "/api/admin/moderation"
      );
      setItems(r.items);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!sessionLoading && user?.role === "admin") void load();
  }, [load, sessionLoading, user]);

  async function act(id: string, action: "hide" | "unhide" | "remove") {
    const reason = reasons[id]?.trim();
    if (!reason || reason.length < 4) {
      setError("Reason is required (min 4 chars)");
      return;
    }
    setBusyId(id);
    setError(null);
    try {
      await api.patch(`/api/admin/moderation/${id}`, { action, reason });
      await load();
      setReasons((r) => ({ ...r, [id]: "" }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Action failed");
    } finally {
      setBusyId(null);
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

  return (
    <div className="container py-10 md:py-14 space-y-6 max-w-5xl">
      <AdminSubNav />

      <div>
        <Badge variant="outline" className="mb-2">Admin · Moderation</Badge>
        <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
          Keep the room <span className="gradient-text">civil</span>.
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Comments with at least one report or already hidden, sorted by report
          count. Every action requires a reason and is audit-logged.
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="rounded-2xl border border-border/60 bg-card p-4 md:p-6">
        <h3 className="font-semibold flex items-center gap-2 mb-4">
          <ShieldAlert className="h-4 w-4 text-amber-500" />
          {items.length} item{items.length === 1 ? "" : "s"} to review
        </h3>
        {loading ? (
          <div className="text-center text-muted-foreground py-10">
            <Loader2 className="h-5 w-5 animate-spin mx-auto" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-center text-muted-foreground py-10">
            Nothing pending. The room is calm.
          </p>
        ) : (
          <ul className="space-y-3">
            {items.map((it) => (
              <li
                key={it.id}
                className="rounded-xl border border-border/60 bg-background p-4"
              >
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {it.status}
                    </Badge>
                    {it.flagCount > 0 && (
                      <span className="text-amber-500">
                        {it.flagCount} report{it.flagCount > 1 ? "s" : ""}
                      </span>
                    )}
                    <Link
                      href={`/contestants/${it.contestantId}`}
                      className="hover:text-foreground"
                    >
                      → {it.contestantDisplay}
                    </Link>
                  </div>
                  <span>{new Date(it.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-sm">
                  <span className="text-muted-foreground">{it.authorDisplay}: </span>
                  {it.body}
                </p>
                <div className="mt-3 grid sm:grid-cols-[1fr_auto] gap-2">
                  <Textarea
                    value={reasons[it.id] ?? ""}
                    onChange={(e) =>
                      setReasons((r) => ({ ...r, [it.id]: e.target.value }))
                    }
                    placeholder="Reason (required, ≥ 4 chars)…"
                    rows={2}
                    className="text-xs"
                  />
                  <div className="flex sm:flex-col gap-2">
                    {it.status !== "hidden" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void act(it.id, "hide")}
                        disabled={busyId === it.id}
                      >
                        <EyeOff className="h-3.5 w-3.5 mr-1.5" /> Hide
                      </Button>
                    )}
                    {it.status === "hidden" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void act(it.id, "unhide")}
                        disabled={busyId === it.id}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1.5" /> Unhide
                      </Button>
                    )}
                    {it.status !== "removed" && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => void act(it.id, "remove")}
                        disabled={busyId === it.id}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Remove
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
