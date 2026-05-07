"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, ScrollText, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "@/components/auth/SessionProvider";
import { AdminSubNav } from "@/components/admin/SubNav";
import { api, ApiError } from "@/lib/client-api";

interface AuditRow {
  id: string;
  actor_user_id: string | null;
  target_type: string;
  target_id: string;
  action: string;
  reason: string | null;
  payload: unknown | null;
  created_at: string;
}

const TARGET_TYPES = [
  "",
  "contestant",
  "submission",
  "payment",
  "assignment",
  "setting",
  "contact_message",
  "round",
] as const;

export default function AdminAuditLogsPage() {
  const { user, loading: sessionLoading } = useSession();
  const [items, setItems] = React.useState<AuditRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [targetType, setTargetType] = React.useState<
    (typeof TARGET_TYPES)[number]
  >("");
  const [search, setSearch] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (targetType) qs.set("targetType", targetType);
      if (search.trim()) qs.set("action", search.trim());
      const r = await api.get<{ items: AuditRow[]; total: number }>(
        `/api/admin/audit-logs?${qs}`
      );
      setItems(r.items);
      setTotal(r.total);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [targetType, search]);

  React.useEffect(() => {
    if (!sessionLoading && user?.role === "admin") void load();
  }, [load, sessionLoading, user]);

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
        <Badge variant="outline" className="mb-2">Admin · Audit log</Badge>
        <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
          Every <span className="gradient-text">mutation</span>, recorded.
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          {total.toLocaleString()} entries match. Append-only — entries cannot
          be edited or deleted from the UI.
        </p>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-4 grid sm:grid-cols-[1fr_auto] gap-3 items-end">
        <div className="space-y-1.5">
          <label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Search className="h-3 w-3" /> Action contains
          </label>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="contestant.status_change, payment.override, …"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs uppercase tracking-wider text-muted-foreground">
            Target type
          </label>
          <select
            value={targetType}
            onChange={(e) =>
              setTargetType(
                e.target.value as (typeof TARGET_TYPES)[number]
              )
            }
            className="h-11 rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="">All</option>
            {TARGET_TYPES.filter((t) => t !== "").map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="rounded-2xl border border-border/60 bg-card p-4 md:p-6">
        <h3 className="font-semibold flex items-center gap-2 mb-4">
          <ScrollText className="h-4 w-4 text-brand-500" />
          {items.length} entries
        </h3>
        {loading ? (
          <div className="text-center text-muted-foreground py-10">
            <Loader2 className="h-5 w-5 animate-spin mx-auto" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-center text-muted-foreground py-10">
            No matching entries.
          </p>
        ) : (
          <ol className="space-y-2">
            {items.map((a) => (
              <li
                key={a.id}
                className="rounded-lg border border-border/60 bg-background p-3 text-xs"
              >
                <div className="flex flex-wrap items-center gap-2 justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {a.target_type}
                    </Badge>
                    <span className="font-mono">{a.action}</span>
                    <Link
                      href={
                        a.target_type === "contestant"
                          ? `/admin/contestants/${a.target_id}`
                          : a.target_type === "payment"
                          ? `/admin/payments?q=${encodeURIComponent(a.target_id)}`
                          : "#"
                      }
                      className="text-muted-foreground hover:text-foreground"
                    >
                      → {a.target_id.slice(0, 32)}
                      {a.target_id.length > 32 ? "…" : ""}
                    </Link>
                  </div>
                  <span className="text-muted-foreground">
                    {new Date(a.created_at).toLocaleString()}
                  </span>
                </div>
                {a.reason && (
                  <p className="mt-1 italic text-muted-foreground">
                    &ldquo;{a.reason}&rdquo;
                  </p>
                )}
                {a.payload != null && (
                  <pre className="mt-1 whitespace-pre-wrap text-[10px] text-muted-foreground line-clamp-3">
                    {JSON.stringify(a.payload)}
                  </pre>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
