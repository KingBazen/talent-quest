"use client";

import * as React from "react";
import {
  Banknote,
  CheckCircle2,
  CreditCard,
  Loader2,
  AlertTriangle,
  Search,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSession } from "@/components/auth/SessionProvider";
import { AdminSubNav } from "@/components/admin/SubNav";
import { bankByCode } from "@/data/banks";
import { api, ApiError } from "@/lib/client-api";

// ─── Types mirrored from src/lib/db PaymentRow ───────────────────────────────

interface PaymentItem {
  id: string;
  contestant_id: string;
  amount_cents: number;
  currency: string;
  provider: string;
  provider_ref: string | null;
  status: "pending" | "succeeded" | "failed" | "refunded";
  method?: "wallet" | "bank_transfer";
  bank_name?: string | null;
  receipt_url?: string | null;
  receipt_uploaded_at?: string | null;
  created_at: string;
  updated_at: string;
}

interface PaymentEvent {
  id: string;
  kind: string;
  status_before: string | null;
  status_after: string | null;
  reason: string | null;
  payload: unknown | null;
  actor_user_id: string | null;
  created_at: string;
}

type StatusFilter = "" | PaymentItem["status"];

export default function AdminPaymentsPage() {
  const { user, loading: sessionLoading } = useSession();
  const [items, setItems] = React.useState<PaymentItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("");
  const [stuck, setStuck] = React.useState(false);
  const [receiptsOnly, setReceiptsOnly] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [drawerId, setDrawerId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (statusFilter) qs.set("status", statusFilter);
      if (stuck) qs.set("stuck", "1");
      if (receiptsOnly) qs.set("receipts", "1");
      if (search.trim()) qs.set("q", search.trim());
      const r = await api.get<{ items: PaymentItem[]; total: number }>(
        `/api/admin/payments${qs.toString() ? `?${qs}` : ""}`
      );
      setItems(r.items);
      setTotal(r.total);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load payments");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, stuck, receiptsOnly, search]);

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

  const stuckCount = items.filter(
    (p) =>
      p.status === "pending" &&
      Date.now() - new Date(p.created_at).getTime() > 24 * 3600 * 1000
  ).length;

  return (
    <div className="container py-10 md:py-14 space-y-6">
      <AdminSubNav />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Badge variant="outline" className="mb-2">Admin · Payments</Badge>
          <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
            <span className="gradient-text">Payments</span> control room.
          </h1>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()}>
          Refresh
        </Button>
      </div>

      {/* Filter bar */}
      <div className="rounded-2xl border border-border/60 bg-card p-4 grid sm:grid-cols-[1fr_auto_auto_auto_auto] gap-3 items-end">
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wider">Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="contestant ID or pay_…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wider">Status</Label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="h-11 rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="succeeded">Succeeded</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm rounded-lg border border-border/60 bg-background px-3 py-2 cursor-pointer">
          <input
            type="checkbox"
            checked={stuck}
            onChange={(e) => setStuck(e.target.checked)}
          />
          Stuck &gt; 24 h
          {stuckCount > 0 && !stuck && (
            <Badge variant="secondary" className="ml-1 text-xs">
              {stuckCount}
            </Badge>
          )}
        </label>
        <label className="flex items-center gap-2 text-sm rounded-lg border border-border/60 bg-background px-3 py-2 cursor-pointer">
          <input
            type="checkbox"
            checked={receiptsOnly}
            onChange={(e) => setReceiptsOnly(e.target.checked)}
          />
          <Banknote className="h-3.5 w-3.5" />
          Receipts to review
        </label>
      </div>

      {error && (
        <p className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-border/60 bg-card p-4 md:p-6">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <h3 className="font-semibold flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-brand-500" />
            {total.toLocaleString()} payment{total === 1 ? "" : "s"}
            {stuck && <Badge variant="outline" className="ml-2">stuck filter on</Badge>}
          </h3>
        </div>

        {loading ? (
          <div className="text-center text-muted-foreground py-10">
            <Loader2 className="h-5 w-5 animate-spin mx-auto" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-center text-muted-foreground py-10">
            No payments match those filters.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-muted-foreground border-b border-border/60">
                  <th className="py-2 px-2">Payment ID</th>
                  <th className="py-2 px-2">Contestant</th>
                  <th className="py-2 px-2">Amount</th>
                  <th className="py-2 px-2">Method</th>
                  <th className="py-2 px-2">Status</th>
                  <th className="py-2 px-2">Created</th>
                  <th className="py-2 px-2">Provider ref</th>
                  <th className="py-2 px-2"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => {
                  const ageHours =
                    (Date.now() - new Date(p.created_at).getTime()) /
                    3600000;
                  const isStuck = p.status === "pending" && ageHours > 24;
                  return (
                    <tr
                      key={p.id}
                      className="border-b border-border/40 hover:bg-muted/40"
                    >
                      <td className="py-2 px-2 font-mono text-xs">{p.id}</td>
                      <td className="py-2 px-2 font-mono">{p.contestant_id}</td>
                      <td className="py-2 px-2">
                        {(p.amount_cents / 100).toFixed(2)} {p.currency}
                      </td>
                      <td className="py-2 px-2">
                        {p.method === "bank_transfer" ? (
                          <Badge variant="outline" className="gap-1">
                            <Banknote className="h-3 w-3" />
                            {(p.bank_name &&
                              bankByCode(p.bank_name)?.shortName) ||
                              p.bank_name ||
                              "bank"}
                            {p.receipt_url && (
                              <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            )}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1">
                            <CreditCard className="h-3 w-3" />
                            wallet
                          </Badge>
                        )}
                      </td>
                      <td className="py-2 px-2">
                        <Badge variant={badgeForStatus(p.status)}>
                          {p.status}
                        </Badge>
                        {isStuck && (
                          <Badge
                            variant="outline"
                            className="ml-1 text-amber-600 border-amber-500/40"
                          >
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {Math.round(ageHours)} h
                          </Badge>
                        )}
                      </td>
                      <td className="py-2 px-2 text-muted-foreground text-xs">
                        {new Date(p.created_at).toLocaleString()}
                      </td>
                      <td className="py-2 px-2 font-mono text-xs">
                        {p.provider_ref ?? "—"}
                      </td>
                      <td className="py-2 px-2 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDrawerId(p.id)}
                        >
                          Open
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={!!drawerId} onOpenChange={(o) => !o && setDrawerId(null)}>
        <DialogContent className="max-w-2xl">
          {drawerId && (
            <PaymentDrawer
              paymentId={drawerId}
              onClose={() => setDrawerId(null)}
              onChanged={() => {
                void load();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Drawer (override + refund) ──────────────────────────────────────────────

function PaymentDrawer({
  paymentId,
  onClose,
  onChanged,
}: {
  paymentId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [data, setData] = React.useState<{
    payment: PaymentItem;
    events: PaymentEvent[];
  } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<"override" | "refund">("override");

  // Override form state
  const [overrideStatus, setOverrideStatus] = React.useState<
    "pending" | "succeeded" | "failed"
  >("succeeded");
  const [overrideRef, setOverrideRef] = React.useState("");
  const [overrideReason, setOverrideReason] = React.useState("");

  // Bank-transfer quick approve/reject form state
  const [reviewMessage, setReviewMessage] = React.useState("");

  // Refund form state
  const [refundReason, setRefundReason] = React.useState("");
  const [refundRef, setRefundRef] = React.useState("");
  const [refundRequestOnly, setRefundRequestOnly] = React.useState(false);

  const load = React.useCallback(async () => {
    setErr(null);
    try {
      const r = await api.get<{
        payment: PaymentItem;
        events: PaymentEvent[];
      }>(`/api/admin/payments/${paymentId}`);
      setData(r);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to load");
    }
  }, [paymentId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function submitOverride() {
    setBusy(true);
    setErr(null);
    try {
      await api.patch(`/api/admin/payments/${paymentId}`, {
        status: overrideStatus,
        providerRef: overrideRef || undefined,
        reason: overrideReason,
      });
      setOverrideReason("");
      setOverrideRef("");
      await load();
      onChanged();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Override failed");
    } finally {
      setBusy(false);
    }
  }

  async function reviewBankTransfer(decision: "approve" | "reject") {
    if (reviewMessage.trim().length < 4) {
      setErr("Add a message for the contestant (at least 4 characters).");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await api.patch(`/api/admin/payments/${paymentId}`, {
        status: decision === "approve" ? "succeeded" : "failed",
        reason:
          decision === "approve"
            ? `Bank-transfer receipt approved: ${reviewMessage.trim()}`
            : `Bank-transfer receipt rejected: ${reviewMessage.trim()}`,
      });
      setReviewMessage("");
      await load();
      onChanged();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Review failed");
    } finally {
      setBusy(false);
    }
  }

  async function submitRefund() {
    setBusy(true);
    setErr(null);
    try {
      await api.post(`/api/admin/payments/${paymentId}/refund`, {
        reason: refundReason,
        providerRef: refundRef || undefined,
        requestOnly: refundRequestOnly,
      });
      setRefundReason("");
      setRefundRef("");
      await load();
      onChanged();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Refund failed");
    } finally {
      setBusy(false);
    }
  }

  if (!data) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mx-auto" />
      </div>
    );
  }

  const p = data.payment;

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-brand-500" />
          <span className="font-mono text-sm">{p.id}</span>
        </DialogTitle>
        <DialogDescription>
          {(p.amount_cents / 100).toFixed(2)} {p.currency} · contestant{" "}
          <span className="font-mono">{p.contestant_id}</span> ·{" "}
          <Badge variant={badgeForStatus(p.status)}>{p.status}</Badge>
        </DialogDescription>
      </DialogHeader>

      <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-xs space-y-1">
        <p>
          Created: {new Date(p.created_at).toLocaleString()} · Updated:{" "}
          {new Date(p.updated_at).toLocaleString()}
        </p>
        <p>
          Provider: <span className="font-mono">{p.provider}</span>
          {p.provider_ref && (
            <>
              {" "}
              · ref <span className="font-mono">{p.provider_ref}</span>
            </>
          )}
        </p>
        {p.method && (
          <p>
            Method: <span className="font-mono">{p.method}</span>
            {p.bank_name && (
              <>
                {" "}
                · bank{" "}
                <span className="font-mono">
                  {bankByCode(p.bank_name)?.name || p.bank_name}
                </span>
              </>
            )}
          </p>
        )}
      </div>

      {/* Bank-transfer receipt review — only for pending bank_transfer rows
          with a receipt attached. Quick approve/reject buttons short-circuit
          the override tab below. */}
      {p.method === "bank_transfer" && p.status === "pending" && (
        <ReceiptReviewBlock
          payment={p}
          message={reviewMessage}
          onMessageChange={setReviewMessage}
          busy={busy}
          err={err}
          onApprove={() => void reviewBankTransfer("approve")}
          onReject={() => void reviewBankTransfer("reject")}
        />
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border/60">
        <TabBtn
          active={tab === "override"}
          onClick={() => setTab("override")}
          label="Override status"
        />
        <TabBtn
          active={tab === "refund"}
          onClick={() => setTab("refund")}
          label="Refund"
        />
      </div>

      {tab === "override" && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Use to fix stuck-pending payments after the merchant dashboard
            confirms the real outcome. Already-succeeded payments cannot be
            overridden — use Refund instead.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider">
                New status
              </Label>
              <select
                value={overrideStatus}
                onChange={(e) =>
                  setOverrideStatus(
                    e.target.value as "pending" | "succeeded" | "failed"
                  )
                }
                className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
                disabled={p.status === "succeeded" || p.status === "refunded"}
              >
                <option value="succeeded">succeeded</option>
                <option value="failed">failed</option>
                <option value="pending">pending</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider">
                Provider ref (optional)
              </Label>
              <Input
                value={overrideRef}
                onChange={(e) => setOverrideRef(e.target.value)}
                placeholder="AdmasPay tradeNo"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider">
              Reason (required)
            </Label>
            <Textarea
              rows={2}
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="AdmasPay confirmed succeeded via merchant dashboard at 14:32. Webhook never fired."
            />
          </div>
          {err && <p className="text-sm text-destructive">{err}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="gradient"
              onClick={submitOverride}
              disabled={
                busy ||
                overrideReason.trim().length < 4 ||
                p.status === "succeeded" ||
                p.status === "refunded"
              }
            >
              {busy ? "Saving…" : "Override status"}
            </Button>
          </div>
        </div>
      )}

      {tab === "refund" && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Two-step record-only refund. Use{" "}
            <strong>Request only</strong> when finance is initiating the
            refund in AdmasPay; flip to <strong>Complete</strong> after the
            funds are out the door.
          </p>
          {p.status !== "succeeded" && (
            <p className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
              Only <span className="font-mono">succeeded</span> payments can be
              refunded. This one is <span className="font-mono">{p.status}</span>.
            </p>
          )}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider">
                Provider ref (optional)
              </Label>
              <Input
                value={refundRef}
                onChange={(e) => setRefundRef(e.target.value)}
                placeholder="AdmasPay refundId"
              />
            </div>
            <label className="flex items-center gap-2 text-sm rounded-lg border border-border/60 bg-background px-3 py-2 cursor-pointer">
              <input
                type="checkbox"
                checked={refundRequestOnly}
                onChange={(e) => setRefundRequestOnly(e.target.checked)}
              />
              Request only (don&apos;t flip status yet)
            </label>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider">
              Reason (required)
            </Label>
            <Textarea
              rows={2}
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="Contestant withdrew within 7-day window per /refund-policy."
            />
          </div>
          {err && <p className="text-sm text-destructive">{err}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="gradient"
              onClick={submitRefund}
              disabled={
                busy ||
                refundReason.trim().length < 4 ||
                p.status !== "succeeded"
              }
            >
              {busy
                ? "Saving…"
                : refundRequestOnly
                ? "Record refund request"
                : "Mark refunded"}
            </Button>
          </div>
        </div>
      )}

      {/* Event timeline */}
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Event timeline ({data.events.length})
        </p>
        <ol className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {data.events.map((e) => (
            <li
              key={e.id}
              className="rounded-lg border border-border/60 bg-background p-3 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono">{e.kind}</span>
                <span className="text-muted-foreground">
                  {new Date(e.created_at).toLocaleString()}
                </span>
              </div>
              {(e.status_before || e.status_after) && (
                <p className="mt-1 text-muted-foreground">
                  {e.status_before ?? "—"} →{" "}
                  <span className="font-medium text-foreground">
                    {e.status_after ?? "—"}
                  </span>
                </p>
              )}
              {e.reason && (
                <p className="mt-1 italic text-muted-foreground">
                  &ldquo;{e.reason}&rdquo;
                </p>
              )}
            </li>
          ))}
        </ol>
      </div>
    </>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function TabBtn({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
        active
          ? "border-brand-500 text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function badgeForStatus(
  s: PaymentItem["status"]
): "secondary" | "outline" | "gradient" | "default" {
  switch (s) {
    case "succeeded":
      return "gradient";
    case "pending":
      return "outline";
    case "failed":
      return "secondary";
    case "refunded":
      return "secondary";
  }
}

function ReceiptReviewBlock({
  payment,
  message,
  onMessageChange,
  busy,
  err,
  onApprove,
  onReject,
}: {
  payment: PaymentItem;
  message: string;
  onMessageChange: (v: string) => void;
  busy: boolean;
  err: string | null;
  onApprove: () => void;
  onReject: () => void;
}) {
  const bank = payment.bank_name ? bankByCode(payment.bank_name) : null;
  const hasReceipt = Boolean(payment.receipt_url);

  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <Banknote className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-semibold text-sm">
            Bank transfer · {bank?.name || payment.bank_name || "—"}
          </p>
          <p className="text-xs text-muted-foreground">
            ETB {(payment.amount_cents / 100).toFixed(2)} · reference{" "}
            <span className="font-mono">{payment.id}</span>
            {payment.receipt_uploaded_at && (
              <>
                {" "}
                · receipt uploaded{" "}
                {new Date(payment.receipt_uploaded_at).toLocaleString()}
              </>
            )}
          </p>
        </div>
      </div>

      {hasReceipt ? (
        <a
          href={payment.receipt_url ?? undefined}
          target="_blank"
          rel="noreferrer"
          className="block rounded-lg overflow-hidden border border-border/60 bg-background"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={payment.receipt_url ?? ""}
            alt="Bank transfer receipt"
            className="w-full max-h-96 object-contain bg-muted/40"
          />
          <p className="text-[11px] text-muted-foreground px-2 py-1 border-t border-border/60">
            Click to open full size in a new tab
          </p>
        </a>
      ) : (
        <p className="rounded-lg border border-border/60 bg-background px-3 py-3 text-xs text-muted-foreground">
          The contestant has not uploaded a receipt yet. Wait for upload before
          approving.
        </p>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs uppercase tracking-wider">
          Message to contestant (required)
        </Label>
        <Textarea
          rows={2}
          value={message}
          onChange={(e) => onMessageChange(e.target.value)}
          placeholder="e.g. Confirmed via CBE statement, transfer 41244 on 2026-05-07. Thank you."
        />
        <p className="text-[11px] text-muted-foreground">
          The message is appended to the payment audit log so the contestant
          and ops can see why the payment was approved or rejected.
        </p>
      </div>

      {err && (
        <p className="rounded-lg bg-destructive/10 border border-destructive/30 p-2 text-xs text-destructive">
          {err}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          onClick={onReject}
          disabled={busy || !hasReceipt || message.trim().length < 4}
          className="border-destructive/40 text-destructive hover:bg-destructive/10"
        >
          <XCircle className="mr-2 h-4 w-4" />
          Reject
        </Button>
        <Button
          variant="gradient"
          onClick={onApprove}
          disabled={busy || !hasReceipt || message.trim().length < 4}
        >
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Approve receipt
        </Button>
      </div>
    </div>
  );
}

