"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Loader2,
  ArrowLeft,
  CheckCircle2,
  Clock,
  CreditCard,
  Film,
  ScrollText,
  Save,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/components/auth/SessionProvider";
import { AdminSubNav } from "@/components/admin/SubNav";
import { TALENT_CATEGORIES } from "@/data/categories";
import { api, ApiError } from "@/lib/client-api";
import type { ContestantDTO } from "@/lib/dto-types";
import { cn } from "@/lib/utils";

interface SubmissionRow {
  id: string;
  title: string;
  category: string;
  status: "pending" | "approved" | "rejected" | "flagged" | "superseded";
  videoUrl: string | null;
  thumbnailUrl: string | null;
  durationSec: number | null;
  supersedesId: string | null;
  supersededAt: string | null;
  createdAt: string;
  score: { total: number; judges: number } | null;
}

interface PaymentRow {
  id: string;
  amountCents: number;
  currency: string;
  provider: string;
  providerRef: string | null;
  status: "pending" | "succeeded" | "failed" | "refunded";
  createdAt: string;
  updatedAt: string;
}

interface AuditEntry {
  id: string;
  action: string;
  actorUserId: string | null;
  reason: string | null;
  payload: unknown | null;
  createdAt: string;
}

interface DetailResponse {
  contestant: ContestantDTO;
  submissions: SubmissionRow[];
  payments: PaymentRow[];
  auditLog: AuditEntry[];
}

const STATUS_OPTIONS = [
  "registered",
  "submitted",
  "shortlisted",
  "advanced",
  "eliminated",
] as const;

export default function AdminContestantDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { user, loading: sessionLoading } = useSession();
  const [data, setData] = React.useState<DetailResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const [newStatus, setNewStatus] = React.useState<
    (typeof STATUS_OPTIONS)[number] | ""
  >("");
  const [reason, setReason] = React.useState("");

  const load = React.useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const r = await api.get<DetailResponse>(`/api/admin/contestants/${id}`);
      setData(r);
      setNewStatus(r.contestant.status);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load");
    }
  }, [id]);

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
  if (error || !data) {
    return (
      <div className="container py-20 max-w-xl text-center">
        <p className="text-destructive">{error}</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/admin/contestants">
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to list
          </Link>
        </Button>
      </div>
    );
  }

  const c = data.contestant;
  const cat = TALENT_CATEGORIES.find((x) => x.id === c.category);
  const completed = c.progress.filter((p) => p.done).length;

  async function submitStatus() {
    if (!data || newStatus === "" || newStatus === data.contestant.status) return;
    if (reason.trim().length < 4) {
      setError("Reason must be at least 4 characters");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.patch(`/api/admin/contestants/${data.contestant.id}/status`, {
        status: newStatus,
        reason: reason.trim(),
      });
      setReason("");
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Status update failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container py-10 md:py-14 space-y-6 max-w-5xl">
      <AdminSubNav />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/contestants">
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to list
          </Link>
        </Button>
        <Badge variant={badgeForStatus(c.status)} className="capitalize">
          {c.status}
        </Badge>
      </div>

      {/* Identity card */}
      <div className="rounded-2xl border border-border/60 bg-card p-6">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-3xl font-bold">
              {c.fullName}
              {c.stageName && (
                <span className="ml-2 text-base font-normal text-muted-foreground">
                  ({c.stageName})
                </span>
              )}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              ID <span className="font-mono">{c.id}</span> ·{" "}
              {cat?.emoji} {cat?.name ?? c.category} · {c.city}, {c.country} ·
              age {c.age}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {c.email} · {c.phone} · registered{" "}
              {new Date(c.createdAt).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="mt-6 grid sm:grid-cols-3 gap-3 text-sm">
          <Stat label="Stages cleared" v={`${completed}/${c.progress.length}`} />
          <Stat label="Submissions" v={String(data.submissions.length)} />
          <Stat
            label="Payments"
            v={`${
              data.payments.filter((p) => p.status === "succeeded").length
            } paid · ${data.payments.length} total`}
          />
        </div>
      </div>

      {/* Status mutation panel */}
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6">
        <h2 className="font-display text-xl font-bold flex items-center gap-2">
          Move contestant status
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Every change is audit-logged with your user id, the before/after
          status, and your reason.
        </p>
        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider">Status</Label>
            <select
              value={newStatus}
              onChange={(e) =>
                setNewStatus(e.target.value as (typeof STATUS_OPTIONS)[number])
              }
              className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
              disabled={c.status === "eliminated"}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider">
              Reason (required)
            </Label>
            <Textarea
              rows={1}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Panel decision after live audition on 2026-08-20."
            />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button
            variant="gradient"
            disabled={
              busy ||
              newStatus === c.status ||
              reason.trim().length < 4 ||
              c.status === "eliminated"
            }
            onClick={submitStatus}
          >
            {busy ? "Saving…" : "Update status"}
            <Save className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Pipeline timeline */}
      <div className="rounded-2xl border border-border/60 bg-card p-6">
        <h2 className="font-display text-xl font-bold mb-4">Pipeline</h2>
        <ol className="relative border-l border-border/60 ml-3 space-y-4">
          {c.progress.map((p) => (
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
              <p className="font-semibold text-sm">{p.label}</p>
              <p className="text-xs text-muted-foreground">
                {p.done && p.date ? new Date(p.date).toLocaleString() : "Pending"}
              </p>
            </li>
          ))}
        </ol>
      </div>

      {/* Submissions */}
      <div className="rounded-2xl border border-border/60 bg-card p-6">
        <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2">
          <Film className="h-4 w-4 text-brand-500" />
          Submissions ({data.submissions.length})
        </h2>
        {data.submissions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No submissions yet.</p>
        ) : (
          <ul className="space-y-2">
            {data.submissions.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background px-4 py-3 flex-wrap"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-1">{s.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(s.createdAt).toLocaleString()}
                    {s.supersedesId && " · replaces an earlier take"}
                    {s.supersededAt && " · superseded"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {s.score && (
                    <Badge variant="gradient">
                      {s.score.total} / 100 ({s.score.judges})
                    </Badge>
                  )}
                  <Badge
                    variant={badgeForSubmissionStatus(s.status)}
                    className="capitalize"
                  >
                    {s.status}
                  </Badge>
                  {s.videoUrl && (
                    <a
                      href={s.videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-brand-500 hover:underline"
                    >
                      Open
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Payments */}
      <div className="rounded-2xl border border-border/60 bg-card p-6">
        <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-brand-500" />
          Payments ({data.payments.length})
        </h2>
        {data.payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments recorded.</p>
        ) : (
          <ul className="space-y-2">
            {data.payments.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background px-4 py-3 flex-wrap"
              >
                <div>
                  <p className="text-sm font-mono">{p.id}</p>
                  <p className="text-xs text-muted-foreground">
                    {(p.amountCents / 100).toFixed(2)} {p.currency} ·{" "}
                    {p.provider} ·{" "}
                    {new Date(p.createdAt).toLocaleString()}
                    {p.providerRef && (
                      <>
                        {" "}
                        · ref{" "}
                        <span className="font-mono">{p.providerRef}</span>
                      </>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={badgeForPaymentStatus(p.status)}>
                    {p.status}
                  </Badge>
                  <Link
                    href={`/admin/payments?q=${encodeURIComponent(p.id)}`}
                    className="text-xs text-brand-500 hover:underline"
                  >
                    Manage
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Audit log */}
      <div className="rounded-2xl border border-border/60 bg-card p-6">
        <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2">
          <ScrollText className="h-4 w-4 text-brand-500" />
          Recent activity ({data.auditLog.length})
        </h2>
        {data.auditLog.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No status changes yet.
          </p>
        ) : (
          <ol className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {data.auditLog.map((a) => (
              <li
                key={a.id}
                className="rounded-lg border border-border/60 bg-background p-3 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono">{a.action}</span>
                  <span className="text-muted-foreground">
                    {new Date(a.createdAt).toLocaleString()}
                  </span>
                </div>
                {a.reason && (
                  <p className="mt-1 italic text-muted-foreground">
                    &ldquo;{a.reason}&rdquo;
                  </p>
                )}
                {a.payload != null && (
                  <pre className="mt-1 whitespace-pre-wrap text-[10px] text-muted-foreground">
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

function Stat({ label, v }: { label: string; v: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="font-medium">{v}</p>
    </div>
  );
}

function badgeForStatus(
  s: string
): "secondary" | "outline" | "gradient" | "default" {
  switch (s) {
    case "shortlisted":
    case "advanced":
      return "gradient";
    case "registered":
    case "submitted":
      return "outline";
    case "eliminated":
      return "secondary";
    default:
      return "outline";
  }
}

function badgeForSubmissionStatus(
  s: SubmissionRow["status"]
): "secondary" | "outline" | "gradient" | "default" {
  switch (s) {
    case "approved":
      return "gradient";
    case "pending":
      return "outline";
    case "rejected":
    case "flagged":
    case "superseded":
      return "secondary";
  }
}

function badgeForPaymentStatus(
  s: PaymentRow["status"]
): "secondary" | "outline" | "gradient" | "default" {
  switch (s) {
    case "succeeded":
      return "gradient";
    case "pending":
      return "outline";
    case "failed":
    case "refunded":
      return "secondary";
  }
}
