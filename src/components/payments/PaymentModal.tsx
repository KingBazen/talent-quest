"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Banknote,
  CheckCircle2,
  ExternalLink,
  Loader2,
  RefreshCw,
  Smartphone,
  Upload as UploadIcon,
  XCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ETHIOPIAN_BANKS, type EthiopianBank } from "@/data/banks";
import { api, ApiError } from "@/lib/client-api";

// ─── Types mirrored from server payloads ─────────────────────────────────────

interface InitResponse {
  paymentId: string;
  amountCents: number;
  currency: string;
  redirectUrl: string;
  mode: "api" | "checkout" | "bank_transfer";
  method: "wallet" | "bank_transfer";
}

interface PaymentStatusDTO {
  id: string;
  status: "pending" | "succeeded" | "failed" | "refunded";
  amountCents: number;
  currency: string;
  method: "wallet" | "bank_transfer";
  bankName: string | null;
  receiptUrl: string | null;
  receiptUploadedAt: string | null;
  providerRef: string | null;
}

export interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Which tab the modal opens on. Defaults to wallet. */
  defaultTab?: "wallet" | "bank";
  /** Called after the modal observes the payment transition to `succeeded`. */
  onSucceeded?: () => void;
}

const POLL_MS = 3500;

export function PaymentModal({
  open,
  onOpenChange,
  defaultTab = "wallet",
  onSucceeded,
}: PaymentModalProps) {
  const [intent, setIntent] = React.useState<InitResponse | null>(null);
  const [status, setStatus] = React.useState<PaymentStatusDTO["status"] | null>(
    null
  );
  const [statusFull, setStatusFull] = React.useState<PaymentStatusDTO | null>(
    null
  );
  const [tab, setTab] = React.useState<"wallet" | "bank">(defaultTab);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  // Sync the active tab with the requested defaultTab whenever the modal opens.
  React.useEffect(() => {
    if (open) setTab(defaultTab);
  }, [open, defaultTab]);

  // Reset everything when modal closes.
  React.useEffect(() => {
    if (!open) {
      setIntent(null);
      setStatus(null);
      setStatusFull(null);
      setBusy(false);
      setErr(null);
    }
  }, [open]);

  // Poll the active payment while the modal is open and the payment is pending.
  React.useEffect(() => {
    if (!open || !intent || status === "succeeded" || status === "failed") {
      return;
    }
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const tick = async () => {
      if (stopped) return;
      try {
        const data = await api.get<PaymentStatusDTO>(
          `/api/payments/${intent.paymentId}`
        );
        if (stopped) return;
        setStatus(data.status);
        setStatusFull(data);
        if (data.status === "succeeded") {
          onSucceeded?.();
          return;
        }
        if (data.status === "failed") return;
      } catch {
        /* keep polling — transient errors are fine */
      }
      timer = setTimeout(tick, POLL_MS);
    };
    void tick();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [open, intent, status, onSucceeded]);

  // ─── Wallet flow ─────────────────────────────────────────────────────────
  async function startWallet() {
    setErr(null);
    setBusy(true);
    try {
      const i = await api.post<InitResponse>("/api/payments/init", {
        method: "wallet",
      });
      setIntent(i);
      setStatus("pending");
      window.open(i.redirectUrl, "_blank", "noopener,noreferrer");
    } catch (e) {
      setErr(
        e instanceof ApiError
          ? e.message
          : "Could not start wallet checkout. Try again or use bank transfer."
      );
    } finally {
      setBusy(false);
    }
  }

  // ─── Bank-transfer flow ──────────────────────────────────────────────────
  async function startBank(bankCode: string) {
    setErr(null);
    setBusy(true);
    try {
      const i = await api.post<InitResponse>("/api/payments/init", {
        method: "bank_transfer",
        bankCode,
      });
      setIntent(i);
      setStatus("pending");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Could not start bank transfer.");
    } finally {
      setBusy(false);
    }
  }

  async function uploadReceipt(file: File) {
    if (!intent) return;
    setErr(null);
    setBusy(true);
    try {
      const form = new FormData();
      form.append("paymentId", intent.paymentId);
      form.append("file", file);
      const res = await fetch("/api/payments/receipt", {
        method: "POST",
        body: form,
        credentials: "same-origin",
      });
      const env = (await res.json()) as {
        ok: boolean;
        error?: string;
        data?: { receiptUrl: string };
      };
      if (!res.ok || !env.ok) {
        throw new ApiError(res.status, env.error || `Upload failed (${res.status})`);
      }
      // After receipt upload the payment stays 'pending' until admin reviews.
      setStatus("pending");
      // Force a fresh status fetch right away so the UI reflects the receipt url.
      try {
        const next = await api.get<PaymentStatusDTO>(
          `/api/payments/${intent.paymentId}`
        );
        setStatusFull(next);
      } catch {
        /* polling will catch up */
      }
    } catch (e) {
      setErr(
        e instanceof ApiError
          ? e.message
          : "Receipt upload failed. Check the file and try again."
      );
    } finally {
      setBusy(false);
    }
  }

  // ─── Terminal screens ────────────────────────────────────────────────────
  const isSucceeded = status === "succeeded";
  const isFailed = status === "failed";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        {isSucceeded ? (
          <SucceededView amountCents={statusFull?.amountCents ?? null} onClose={() => onOpenChange(false)} />
        ) : isFailed ? (
          <FailedView
            onRetry={() => {
              setIntent(null);
              setStatus(null);
              setStatusFull(null);
              setErr(null);
            }}
            onClose={() => onOpenChange(false)}
          />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Pay the audition fee · 500 ETB</DialogTitle>
              <DialogDescription>
                Registration is free. To upload your audition video you need to
                pay the audition fee. Pick a method below — this window updates
                in real time when payment is confirmed.
              </DialogDescription>
            </DialogHeader>

            <Tabs
              value={tab}
              onValueChange={(v) => {
                if (intent) return; // lock tab once a payment is initiated
                setTab(v as "wallet" | "bank");
              }}
            >
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="wallet" disabled={intent ? intent.method !== "wallet" : false}>
                  <Smartphone className="h-4 w-4 mr-2" /> Mobile wallet
                </TabsTrigger>
                <TabsTrigger value="bank" disabled={intent ? intent.method !== "bank_transfer" : false}>
                  <Banknote className="h-4 w-4 mr-2" /> Bank transfer
                </TabsTrigger>
              </TabsList>

              <TabsContent value="wallet">
                <WalletPanel
                  intent={intent && intent.method === "wallet" ? intent : null}
                  status={status}
                  busy={busy}
                  onStart={startWallet}
                  onReopen={() => {
                    if (intent?.redirectUrl) {
                      window.open(intent.redirectUrl, "_blank", "noopener,noreferrer");
                    }
                  }}
                />
              </TabsContent>

              <TabsContent value="bank">
                <BankTransferPanel
                  intent={intent && intent.method === "bank_transfer" ? intent : null}
                  status={status}
                  statusFull={statusFull}
                  busy={busy}
                  onSelectBank={startBank}
                  onUploadReceipt={uploadReceipt}
                />
              </TabsContent>
            </Tabs>

            {err && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {err}
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Wallet panel ────────────────────────────────────────────────────────────

function WalletPanel({
  intent,
  status,
  busy,
  onStart,
  onReopen,
}: {
  intent: InitResponse | null;
  status: PaymentStatusDTO["status"] | null;
  busy: boolean;
  onStart: () => void;
  onReopen: () => void;
}) {
  if (!intent) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-sm">
          <p className="font-semibold">Telebirr · M-Pesa · CBE Birr</p>
          <p className="text-muted-foreground mt-1">
            We open AdmasPay&apos;s secure checkout in a new tab. Once you finish,
            this window confirms automatically.
          </p>
        </div>
        <Button variant="gradient" size="lg" onClick={onStart} disabled={busy} className="w-full">
          {busy ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Starting…
            </>
          ) : (
            <>
              Pay with AdmasPay <ExternalLink className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/60 bg-card p-4 text-sm flex items-start gap-3">
        <Loader2 className="h-5 w-5 shrink-0 mt-0.5 text-brand-500 animate-spin" />
        <div>
          <p className="font-semibold">Waiting for AdmasPay confirmation…</p>
          <p className="text-muted-foreground mt-1">
            Reference{" "}
            <span className="font-mono text-xs">{intent.paymentId}</span> ·{" "}
            ETB {(intent.amountCents / 100).toFixed(2)}
          </p>
          <p className="text-muted-foreground text-xs mt-2">
            Status: <Badge variant="outline" className="ml-1">{status ?? "pending"}</Badge>
          </p>
        </div>
      </div>
      <Button variant="outline" onClick={onReopen} className="w-full">
        <ExternalLink className="mr-2 h-4 w-4" /> Reopen checkout tab
      </Button>
    </div>
  );
}

// ─── Bank-transfer panel ─────────────────────────────────────────────────────

function BankTransferPanel({
  intent,
  status,
  statusFull,
  busy,
  onSelectBank,
  onUploadReceipt,
}: {
  intent: InitResponse | null;
  status: PaymentStatusDTO["status"] | null;
  statusFull: PaymentStatusDTO | null;
  busy: boolean;
  onSelectBank: (bankCode: string) => void;
  onUploadReceipt: (file: File) => void;
}) {
  const [picked, setPicked] = React.useState<EthiopianBank | null>(null);

  // Step 1 — pick a bank.
  if (!intent) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Send <strong>500 ETB</strong> to the deposit account for one of the
          banks below, then upload the screenshot of the transfer receipt.
          An admin will verify your receipt within 1 business day.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ETHIOPIAN_BANKS.map((b) => (
            <button
              key={b.code}
              type="button"
              onClick={() => {
                setPicked(b);
                onSelectBank(b.code);
              }}
              disabled={busy}
              className="rounded-xl border border-border/60 bg-background hover:border-brand-500/60 hover:bg-brand-500/5 p-3 text-left transition-colors disabled:opacity-50"
            >
              <p className="text-xs font-semibold">{b.shortName}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                {b.name}
              </p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const bankName = statusFull?.bankName || picked?.code || "—";
  const receiptUploaded = Boolean(statusFull?.receiptUrl);

  // Step 2 — show deposit info + receipt upload.
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-sm space-y-2">
        <div className="flex items-center justify-between">
          <p className="font-semibold">Deposit details</p>
          <Badge variant="outline">{bankName}</Badge>
        </div>
        <dl className="text-xs text-muted-foreground grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          <dt>Account name</dt>
          <dd className="font-mono">Bling Records Show PLC</dd>
          <dt>Amount</dt>
          <dd className="font-mono">ETB {(intent.amountCents / 100).toFixed(2)}</dd>
          <dt>Reference</dt>
          <dd className="font-mono">{intent.paymentId}</dd>
        </dl>
        <p className="text-[11px] text-muted-foreground italic">
          Use the reference above as the transfer narration so we can match
          your payment to your account.
        </p>
      </div>

      {receiptUploaded ? (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-start gap-3"
        >
          <Loader2 className="h-5 w-5 shrink-0 mt-0.5 text-amber-500 animate-spin" />
          <div className="flex-1">
            <p className="font-semibold text-amber-600 dark:text-amber-400">
              Receipt received — awaiting admin review
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Status: <Badge variant="outline" className="ml-1">{status ?? "pending"}</Badge>
              {" "}
              · This window will confirm automatically once an admin verifies
              your transfer.
            </p>
            {statusFull?.receiptUrl && (
              <a
                href={statusFull.receiptUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-brand-500 underline mt-2 inline-block"
              >
                View uploaded receipt
              </a>
            )}
          </div>
        </motion.div>
      ) : (
        <ReceiptPicker busy={busy} onUpload={onUploadReceipt} />
      )}
    </div>
  );
}

function ReceiptPicker({
  busy,
  onUpload,
}: {
  busy: boolean;
  onUpload: (file: File) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [drag, setDrag] = React.useState(false);

  return (
    <label
      htmlFor="receipt-file"
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onUpload(f);
      }}
      className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
        drag
          ? "border-brand-500 bg-brand-500/5"
          : "border-border/60 bg-background hover:border-brand-500/50"
      } ${busy ? "opacity-50 pointer-events-none" : ""}`}
    >
      <UploadIcon className="h-8 w-8 text-muted-foreground" />
      <p className="font-semibold text-sm">
        {busy ? "Uploading receipt…" : "Tap to upload the receipt screenshot"}
      </p>
      <p className="text-xs text-muted-foreground">
        PNG, JPG, or WebP · ≤ 5 MB
      </p>
      <input
        ref={inputRef}
        id="receipt-file"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        disabled={busy}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpload(f);
        }}
      />
    </label>
  );
}

// ─── Terminal views ──────────────────────────────────────────────────────────

function SucceededView({
  amountCents,
  onClose,
}: {
  amountCents: number | null;
  onClose: () => void;
}) {
  return (
    <>
      <DialogHeader>
        <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white mb-2">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <DialogTitle className="text-center">Payment confirmed</DialogTitle>
        <DialogDescription className="text-center">
          {amountCents
            ? `We received ETB ${(amountCents / 100).toFixed(2)}.`
            : "We received your audition fee."}
          {" "}
          You can now upload your audition video from your dashboard.
        </DialogDescription>
      </DialogHeader>
      <Button variant="gradient" size="lg" onClick={onClose}>
        Continue to upload
      </Button>
    </>
  );
}

function FailedView({
  onRetry,
  onClose,
}: {
  onRetry: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <DialogHeader>
        <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-destructive text-white mb-2">
          <XCircle className="h-7 w-7" />
        </div>
        <DialogTitle className="text-center">Payment didn&apos;t go through</DialogTitle>
        <DialogDescription className="text-center">
          The provider reported the payment as failed. No funds were taken.
          Try again with a different method.
        </DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button variant="gradient" onClick={onRetry}>
          <RefreshCw className="mr-2 h-4 w-4" /> Try again
        </Button>
      </div>
    </>
  );
}
