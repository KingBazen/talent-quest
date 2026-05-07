"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/client-api";

function VerifyEmailInner() {
  const params = useSearchParams();
  const token = params.get("token");
  const [state, setState] = React.useState<
    "idle" | "working" | "ok" | "fail"
  >(token ? "working" : "idle");
  const [error, setError] = React.useState<string | null>(null);

  const sentRef = React.useRef(false);
  React.useEffect(() => {
    if (!token || sentRef.current) return;
    sentRef.current = true;
    (async () => {
      try {
        await api.post("/api/auth/verify-email", { token });
        setState("ok");
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Verification failed");
        setState("fail");
      }
    })();
  }, [token]);

  if (!token) {
    return (
      <div className="container py-20 max-w-lg text-center">
        <Badge variant="outline" className="mb-3">Verify email</Badge>
        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">
          Check your <span className="gradient-text">inbox</span>.
        </h1>
        <p className="mt-3 text-muted-foreground">
          Open the verification link from the email we sent you. If you didn&apos;t
          receive it, sign in and use the &ldquo;Resend verification&rdquo; button on your dashboard.
        </p>
        <Button asChild variant="gradient" size="lg" className="mt-6">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-20 max-w-lg text-center">
      <Badge variant="outline" className="mb-3">Verify email</Badge>
      {state === "working" && (
        <>
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <h1 className="mt-4 font-display text-2xl font-bold tracking-tight">
            Confirming your email…
          </h1>
        </>
      )}
      {state === "ok" && (
        <>
          <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500" />
          <h1 className="mt-4 font-display text-3xl md:text-4xl font-bold tracking-tight">
            Email <span className="gradient-text">verified</span>.
          </h1>
          <p className="mt-3 text-muted-foreground">
            Thanks. You can now submit your audition video.
          </p>
          <Button asChild variant="gradient" size="lg" className="mt-6">
            <Link href="/contestant/dashboard">Go to my dashboard</Link>
          </Button>
        </>
      )}
      {state === "fail" && (
        <>
          <AlertTriangle className="h-12 w-12 mx-auto text-destructive" />
          <h1 className="mt-4 font-display text-2xl font-bold tracking-tight">
            We couldn&apos;t verify that link.
          </h1>
          <p className="mt-3 text-muted-foreground">
            {error ?? "The link is invalid or has expired."} Sign in and request
            a new one from your dashboard.
          </p>
          <Button asChild variant="gradient" size="lg" className="mt-6">
            <Link href="/login">Sign in</Link>
          </Button>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <React.Suspense
      fallback={
        <div className="container py-20 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
        </div>
      }
    >
      <VerifyEmailInner />
    </React.Suspense>
  );
}
