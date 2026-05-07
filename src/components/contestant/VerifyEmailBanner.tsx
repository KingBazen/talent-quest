"use client";

import * as React from "react";
import { CheckCircle2, MailWarning, Loader2 } from "lucide-react";
import { api, ApiError } from "@/lib/client-api";
import { useSession } from "@/components/auth/SessionProvider";
import { useLang } from "@/components/i18n/LangProvider";

/**
 * Phase 7 (P7-T012): inline banner that nudges the contestant to verify their
 * email and offers a one-click resend. Renders nothing if the user is already
 * verified or not signed in. Designed to drop into the contestant dashboard.
 */
export function VerifyEmailBanner() {
  const { user } = useSession();
  const { t } = useLang();
  const [state, setState] = React.useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");
  const [msg, setMsg] = React.useState<string | null>(null);

  if (!user || user.emailVerifiedAt) return null;

  async function resend() {
    setState("sending");
    setMsg(null);
    try {
      await api.post("/api/auth/verify-email/request", {});
      setState("sent");
      setMsg(t.verify_email.sent);
    } catch (e) {
      setState("error");
      setMsg(e instanceof ApiError ? e.message : "Could not send the link.");
    }
  }

  return (
    <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 md:p-5 mb-6">
      <div className="flex items-start gap-3">
        <MailWarning className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-amber-100">{t.verify_email.title}</p>
          <p className="text-sm text-amber-100/80 mt-1">{t.verify_email.body}</p>
          {msg && (
            <p
              className={`text-xs mt-2 ${
                state === "error"
                  ? "text-destructive"
                  : "text-emerald-300"
              }`}
            >
              {state === "sent" && (
                <CheckCircle2 className="inline h-3 w-3 mr-1" />
              )}
              {msg}
            </p>
          )}
        </div>
        <button
          onClick={() => void resend()}
          disabled={state === "sending"}
          className="shrink-0 rounded-lg border border-amber-400/40 bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-100 hover:bg-amber-500/30 disabled:opacity-60"
        >
          {state === "sending" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            t.verify_email.cta_resend
          )}
        </button>
      </div>
    </div>
  );
}
