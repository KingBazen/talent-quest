"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ContestantSubNav } from "@/components/contestant/SubNav";
import { useSession } from "@/components/auth/SessionProvider";
import { api, ApiError } from "@/lib/client-api";

interface NotificationPrefs {
  email_status_changes?: boolean;
  email_payment_updates?: boolean;
  email_referee_assignments?: boolean;
}

const TOGGLES: {
  key: keyof NotificationPrefs;
  title: string;
  body: string;
  rolesShown: (
    | "contestant"
    | "referee"
    | "admin"
    | "audience"
    | "producer"
  )[];
}[] = [
  {
    key: "email_status_changes",
    title: "Status-change emails",
    body: "When your application moves between rounds (registered → submitted → shortlisted → advanced → eliminated), we email you with the result and the next step. Recommended on.",
    rolesShown: ["contestant"],
  },
  {
    key: "email_payment_updates",
    title: "Payment receipts",
    body: "When a payment succeeds, we email you a receipt with the reference and amount. This is also your audit trail for any refund request.",
    rolesShown: ["contestant"],
  },
  {
    key: "email_referee_assignments",
    title: "Referee assignment alerts",
    body: "Only relevant if your account also has the referee role. When an admin assigns you a new audition to score, we email you a link.",
    rolesShown: ["referee", "admin"],
  },
];

export default function ContestantPreferencesPage() {
  const { user, loading: sessionLoading } = useSession();
  const [prefs, setPrefs] = React.useState<NotificationPrefs>({});
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState<keyof NotificationPrefs | null>(
    null
  );
  const [error, setError] = React.useState<string | null>(null);
  const [savedAt, setSavedAt] = React.useState<Date | null>(null);

  React.useEffect(() => {
    if (sessionLoading || !user) return;
    (async () => {
      try {
        const r = await api.get<{ prefs: NotificationPrefs }>(
          "/api/me/preferences"
        );
        setPrefs(r.prefs);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionLoading, user]);

  const toggle = async (key: keyof NotificationPrefs) => {
    setSaving(key);
    setError(null);
    const next = { ...prefs, [key]: prefs[key] === false ? true : false };
    try {
      const r = await api.patch<{ prefs: NotificationPrefs }>(
        "/api/me/preferences",
        { [key]: next[key] }
      );
      setPrefs(r.prefs);
      setSavedAt(new Date());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Save failed");
    } finally {
      setSaving(null);
    }
  };

  if (sessionLoading) {
    return (
      <div className="container py-20 text-center">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
      </div>
    );
  }
  if (!user) {
    return (
      <div className="container py-20 max-w-lg text-center">
        <Badge variant="outline" className="mb-3">Sign in needed</Badge>
        <Button asChild variant="gradient" size="lg" className="mt-6">
          <Link href="/login?next=/contestant/preferences">Sign in</Link>
        </Button>
      </div>
    );
  }

  const visibleToggles = TOGGLES.filter((t) =>
    t.rolesShown.includes(user.role)
  );

  return (
    <div className="container py-10 md:py-14 max-w-2xl">
      <ContestantSubNav />

      <Badge variant="outline" className="mb-2">Notifications</Badge>
      <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
        Stay in the <span className="gradient-text">loop</span>.
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        We always log every event in your in-app inbox. These toggles only
        control whether we also email you.
      </p>

      {error && (
        <p className="mt-6 rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="mt-6 rounded-2xl border border-border/60 bg-card divide-y divide-border/60">
        {loading ? (
          <div className="p-10 text-center">
            <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
          </div>
        ) : (
          visibleToggles.map((t) => {
            const on = prefs[t.key] !== false;
            return (
              <div
                key={t.key}
                className="p-5 flex items-start gap-4"
              >
                <Bell className="h-4 w-4 text-brand-500 mt-1 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{t.title}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t.body}
                  </p>
                </div>
                <button
                  onClick={() => void toggle(t.key)}
                  disabled={saving === t.key}
                  aria-pressed={on}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                    on
                      ? "bg-gradient-to-r from-brand-400 to-brand-600"
                      : "bg-muted"
                  } ${saving === t.key ? "opacity-60" : ""}`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                      on ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            );
          })
        )}
      </div>

      {savedAt && (
        <p className="mt-3 text-xs text-muted-foreground">
          Saved at {savedAt.toLocaleTimeString()}.
        </p>
      )}

      <p className="mt-8 text-xs text-muted-foreground">
        Welcome and email-verification messages are always sent regardless of
        these toggles. They are required for account activation.
      </p>
    </div>
  );
}
