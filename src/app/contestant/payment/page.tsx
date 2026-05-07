"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Banknote,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/components/auth/SessionProvider";
import { ContestantSubNav } from "@/components/contestant/SubNav";
import { PaymentModal } from "@/components/payments/PaymentModal";
import { bankByCode } from "@/data/banks";
import { api } from "@/lib/client-api";

interface PaymentRowDTO {
  id: string;
  amountCents: number;
  currency: string;
  provider: string;
  providerRef: string | null;
  status: "pending" | "succeeded" | "failed" | "refunded";
  method?: "wallet" | "bank_transfer";
  bankName?: string | null;
  receiptUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ListResponse {
  items: PaymentRowDTO[];
  feeRequiredAt: "apply" | "shortlist";
  contestantStatus: string;
}

type ReturnStatus = "success" | "failed" | "cancelled" | null;

export default function ContestantPaymentPage() {
  return (
    <React.Suspense
      fallback={
        <div className="container py-20 text-center text-muted-foreground">
          Loading…
        </div>
      }
    >
      <Inner />
    </React.Suspense>
  );
}

function Inner() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, contestant, latestPayment, loading, refresh } = useSession();
  const [list, setList] = React.useState<ListResponse | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalTab, setModalTab] = React.useState<"wallet" | "bank">("wallet");

  // AdmasPay can deep-link back here with ?status=success|failed|cancelled.
  const returnStatus = params.get("status") as ReturnStatus;
  const returnRef = params.get("ref");

  React.useEffect(() => {
    if (!user || user.role !== "contestant") return;
    api
      .get<ListResponse>("/api/payments")
      .then(setList)
      .catch(() => setList(null));
  }, [user, latestPayment?.id, latestPayment?.status]);

  if (loading) {
    return (
      <div className="container py-20 text-center">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
      </div>
    );
  }
  if (!user || user.role !== "contestant" || !contestant) {
    return (
      <div className="container py-20 max-w-xl text-center">
        <Badge variant="outline" className="mb-3">
          No contestant session
        </Badge>
        <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
          Sign in to view your payment.
        </h1>
        <Button asChild variant="gradient" size="lg" className="mt-6">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  const alreadyPaid =
    latestPayment?.status === "succeeded" ||
    list?.items.some((p) => p.status === "succeeded");

  function openModal(tab: "wallet" | "bank") {
    setModalTab(tab);
    setModalOpen(true);
  }

  function clearReturnStatus() {
    router.replace("/contestant/payment");
  }

  return (
    <div className="container py-10 md:py-14 max-w-3xl">
      <ContestantSubNav />

      <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">
        Audition <span className="gradient-text">fee</span>.
      </h1>
      <p className="mt-2 text-muted-foreground">
        Registration is free, but the 500 ETB audition fee is required before
        you can upload your video. Pay by AdmasPay (Telebirr / M-Pesa / CBE
        Birr) or upload a bank-transfer receipt screenshot.
      </p>

      {returnStatus === "success" && (
        <ReturnBanner
          tone="emerald"
          icon={CheckCircle2}
          title="Payment confirmed"
          body={
            returnRef
              ? `Reference ${returnRef}. The status below should update within a few seconds.`
              : "Your audition fee has been recorded. The status below should update within a few seconds."
          }
          onDismiss={clearReturnStatus}
        />
      )}
      {returnStatus === "failed" && (
        <ReturnBanner
          tone="destructive"
          icon={XCircle}
          title="Payment failed"
          body="No funds were taken. You can retry below or try a different payment method."
          onDismiss={clearReturnStatus}
        />
      )}
      {returnStatus === "cancelled" && (
        <ReturnBanner
          tone="muted"
          icon={RefreshCw}
          title="Payment cancelled"
          body="You closed the AdmasPay tab without completing payment. Nothing was charged."
          onDismiss={clearReturnStatus}
        />
      )}

      {alreadyPaid ? (
        <PaidCard
          latestPayment={
            list?.items.find((p) => p.status === "succeeded") ?? null
          }
        />
      ) : (
        <PayCard onOpenModal={openModal} />
      )}

      {list && list.items.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-xl font-bold mb-3">
            Payment history
          </h2>
          <ul className="space-y-2">
            {list.items.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-border/60 bg-card px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    ETB {(p.amountCents / 100).toFixed(2)}{" "}
                    <span className="text-xs text-muted-foreground">
                      ·{" "}
                      {p.method === "bank_transfer"
                        ? `bank · ${
                            (p.bankName && bankByCode(p.bankName)?.shortName) ||
                            p.bankName ||
                            "—"
                          }`
                        : p.provider}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
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
                <Badge variant={badgeForStatus(p.status)}>{p.status}</Badge>
              </li>
            ))}
          </ul>
        </section>
      )}

      <PaymentModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        defaultTab={modalTab}
        onSucceeded={() => void refresh()}
      />
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ReturnBanner({
  tone,
  icon: Icon,
  title,
  body,
  onDismiss,
}: {
  tone: "emerald" | "destructive" | "muted";
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  onDismiss: () => void;
}) {
  const colors = {
    emerald: "border-emerald-500/30 bg-emerald-500/5 text-emerald-500",
    destructive: "border-destructive/30 bg-destructive/5 text-destructive",
    muted: "border-border/60 bg-muted/30 text-muted-foreground",
  } as const;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`mt-6 rounded-xl border p-4 flex items-start gap-3 ${colors[tone]}`}
    >
      <Icon className="h-5 w-5 shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground mt-1">{body}</p>
      </div>
      <Button variant="ghost" size="sm" onClick={onDismiss}>
        Dismiss
      </Button>
    </motion.div>
  );
}

function PaidCard({ latestPayment }: { latestPayment: PaymentRowDTO | null }) {
  return (
    <div className="mt-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6">
      <div className="flex items-start gap-4 flex-wrap">
        <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-display text-xl font-bold">Audition fee paid</h3>
          {latestPayment && (
            <p className="text-sm text-muted-foreground mt-1">
              ETB {(latestPayment.amountCents / 100).toFixed(2)} ·{" "}
              {new Date(latestPayment.createdAt).toLocaleString()}
              {latestPayment.providerRef && (
                <>
                  {" "}
                  · ref{" "}
                  <span className="font-mono">{latestPayment.providerRef}</span>
                </>
              )}
            </p>
          )}
        </div>
        <Badge variant="gradient" className="shrink-0">
          Confirmed
        </Badge>
      </div>
    </div>
  );
}

function PayCard({
  onOpenModal,
}: {
  onOpenModal: (tab: "wallet" | "bank") => void;
}) {
  return (
    <div className="mt-8 rounded-2xl border border-border/60 bg-gradient-to-br from-brand-500/5 via-brand-500/5 to-brand-700/5 p-6">
      <div className="flex items-start gap-4 flex-wrap">
        <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-white">
          <CreditCard className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-[220px]">
          <h3 className="font-display text-xl font-bold">
            Audition fee · 500 ETB
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Pick a method below. The window updates in real time once your
            payment is confirmed.
          </p>
        </div>
      </div>

      <div className="mt-5 grid sm:grid-cols-2 gap-2">
        <Button
          variant="gradient"
          size="lg"
          onClick={() => onOpenModal("wallet")}
        >
          Pay with AdmasPay
          <ExternalLink className="ml-2 h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={() => onOpenModal("bank")}
        >
          <Banknote className="mr-2 h-4 w-4" />
          Or pay anywhere · upload receipt
        </Button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Bank-transfer payments are reviewed by an admin within 1 business day.
      </p>
    </div>
  );
}

function badgeForStatus(
  s: PaymentRowDTO["status"]
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
