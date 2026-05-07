"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, Mail, Search, CheckCircle2, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/components/auth/SessionProvider";
import { AdminSubNav } from "@/components/admin/SubNav";
import { api, ApiError } from "@/lib/client-api";

interface Row {
  id: string;
  name: string;
  email: string;
  topic: string;
  message: string;
  handled: number;
  handled_by_user_id: string | null;
  handled_at: string | null;
  admin_notes: string | null;
  created_at: string;
}

type HandledFilter = "" | "0" | "1";

export default function AdminMessagesPage() {
  const { user, loading: sessionLoading } = useSession();
  const [items, setItems] = React.useState<Row[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [search, setSearch] = React.useState("");
  const [handled, setHandled] = React.useState<HandledFilter>("");
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [draftNotes, setDraftNotes] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (search.trim()) qs.set("q", search.trim());
      if (handled !== "") qs.set("handled", handled);
      const r = await api.get<{ items: Row[]; total: number }>(
        `/api/admin/messages?${qs}`
      );
      setItems(r.items);
      setTotal(r.total);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [search, handled]);

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

  async function setHandledStatus(
    id: string,
    nextHandled: boolean,
    notes: string
  ) {
    setBusy(true);
    setError(null);
    try {
      await api.patch(`/api/admin/messages/${id}`, {
        handled: nextHandled,
        adminNotes: notes,
      });
      await load();
      setOpenId(null);
      setDraftNotes("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  const unhandledCount = items.filter((m) => m.handled === 0).length;

  return (
    <div className="container py-10 md:py-14 space-y-6 max-w-4xl">
      <AdminSubNav />

      <div>
        <Badge variant="outline" className="mb-2">Admin · Messages</Badge>
        <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
          Contact <span className="gradient-text">inbox</span>.
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          {total.toLocaleString()} total · {unhandledCount} unhandled in this view
        </p>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-4 grid sm:grid-cols-[1fr_auto] gap-3 items-end">
        <div className="space-y-1.5">
          <label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Search className="h-3 w-3" /> Search
          </label>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, email, message body…"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs uppercase tracking-wider text-muted-foreground">
            Show
          </label>
          <select
            value={handled}
            onChange={(e) => setHandled(e.target.value as HandledFilter)}
            className="h-11 rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="">All</option>
            <option value="0">Unhandled</option>
            <option value="1">Handled</option>
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
          <Mail className="h-4 w-4 text-brand-500" />
          Messages
        </h3>
        {loading ? (
          <div className="text-center text-muted-foreground py-10">
            <Loader2 className="h-5 w-5 animate-spin mx-auto" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-center text-muted-foreground py-10">
            Nothing in this view.
          </p>
        ) : (
          <ul className="space-y-3">
            {items.map((m) => {
              const expanded = openId === m.id;
              return (
                <li
                  key={m.id}
                  className={`rounded-xl border p-4 ${
                    m.handled
                      ? "border-emerald-500/20 bg-emerald-500/5"
                      : "border-border/60 bg-background"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {m.topic}
                        </Badge>
                        {m.handled === 1 && (
                          <Badge variant="gradient" className="text-[10px]">
                            handled
                          </Badge>
                        )}
                      </div>
                      <p className="font-semibold">{m.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.email} ·{" "}
                        {new Date(m.created_at).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setOpenId(expanded ? null : m.id);
                        setDraftNotes(m.admin_notes ?? "");
                      }}
                    >
                      {expanded ? "Close" : "Open"}
                    </Button>
                  </div>
                  <p className="mt-3 text-sm whitespace-pre-wrap">{m.message}</p>

                  {m.handled === 1 && m.admin_notes && (
                    <p className="mt-2 text-xs text-muted-foreground italic">
                      Admin notes: {m.admin_notes}
                    </p>
                  )}

                  {expanded && (
                    <div className="mt-4 space-y-2 rounded-lg bg-muted/30 p-3">
                      <Textarea
                        rows={2}
                        value={draftNotes}
                        onChange={(e) => setDraftNotes(e.target.value)}
                        placeholder="Internal notes (optional)"
                      />
                      <div className="flex justify-end gap-2">
                        {m.handled ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busy}
                            onClick={() =>
                              setHandledStatus(m.id, false, draftNotes)
                            }
                          >
                            <RotateCcw className="h-3.5 w-3.5 mr-1" />
                            Mark unhandled
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="gradient"
                            disabled={busy}
                            onClick={() =>
                              setHandledStatus(m.id, true, draftNotes)
                            }
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            Mark handled
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
