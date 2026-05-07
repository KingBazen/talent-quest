"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, CreditCard, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/components/auth/SessionProvider";
import { PaymentModal } from "./PaymentModal";

/**
 * Banner shown above the upload guide. Three states:
 *  - Anonymous: prompt to register first.
 *  - Logged-in contestant, unpaid: prompt to pay (opens PaymentModal).
 *  - Logged-in contestant, paid: confirmation + link to upload from dashboard.
 *
 * Renders nothing while the session is loading (avoids a flash of the wrong
 * banner). Non-contestant roles see no banner — the upload guide is also a
 * marketing page for prospective contestants.
 */
export function PayBeforeUploadCTA() {
  const { user, contestant, latestPayment, loading, refresh } = useSession();
  const [open, setOpen] = React.useState(false);

  if (loading) return null;

  // Anonymous visitor — show register CTA.
  if (!user) {
    return (
      <div className="mt-8 rounded-2xl border border-border/60 bg-gradient-to-br from-brand-500/5 to-brand-700/5 p-5 flex items-start gap-4 flex-wrap">
        <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white">
          <Lock className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-[220px]">
          <p className="font-semibold">
            Registration is free — but uploading your audition needs a 500 ETB fee.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Create your account first. You can pay by AdmasPay (Telebirr / M-Pesa /
            CBE Birr) or by uploading a bank-transfer receipt screenshot.
          </p>
        </div>
        <Button asChild variant="gradient" className="shrink-0">
          <Link href="/register">Register free</Link>
        </Button>
      </div>
    );
  }

  // Non-contestant role (referee, admin, etc.) — no CTA.
  if (user.role !== "contestant" || !contestant) return null;

  // Already paid.
  if (latestPayment?.status === "succeeded") {
    return (
      <div className="mt-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 flex items-start gap-4 flex-wrap">
        <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-[220px]">
          <p className="font-semibold">Audition fee paid — you can upload now.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Head to your dashboard to upload your audition video.
          </p>
        </div>
        <Button asChild variant="gradient" className="shrink-0">
          <Link href="/contestant/dashboard">Open dashboard</Link>
        </Button>
      </div>
    );
  }

  // Logged-in contestant with no successful payment — show pay CTA.
  const pendingBank = latestPayment?.status === "pending";

  return (
    <>
      <div className="mt-8 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 flex items-start gap-4 flex-wrap">
        <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white">
          <CreditCard className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-[220px]">
          <p className="font-semibold">
            Pay the 500 ETB audition fee to unlock video upload.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Choose AdmasPay (Telebirr / M-Pesa / CBE Birr) or upload a
            bank-transfer receipt from any of 12 supported Ethiopian banks.
          </p>
          {pendingBank && (
            <Badge variant="outline" className="mt-2">
              A payment is pending review
            </Badge>
          )}
        </div>
        <Button
          variant="gradient"
          className="shrink-0"
          onClick={() => setOpen(true)}
        >
          {pendingBank ? "Open payment status" : "Pay audition fee"}
        </Button>
      </div>

      <PaymentModal
        open={open}
        onOpenChange={setOpen}
        onSucceeded={() => {
          // Refresh session so latestPayment reflects the new state.
          void refresh();
        }}
      />
    </>
  );
}
