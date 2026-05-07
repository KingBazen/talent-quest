"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiError } from "@/lib/client-api";
import { useSession } from "@/components/auth/SessionProvider";

/**
 * Phase 8 (P8-T002): audience (fan) registration page.
 *
 * Three fields — name, email, password. We don't ask for DOB / phone here
 * because fan engagement doesn't need them, and asking would deter signups.
 * The verify-email gate still applies before the fan can comment.
 */
export default function AudienceRegisterPage() {
  const router = useRouter();
  const { refresh } = useSession();
  const [state, setState] = React.useState<"idle" | "submitting">("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    fullName: "",
    email: "",
    password: "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setState("submitting");
    try {
      await api.post("/api/auth/register-audience", form);
      await refresh();
      router.push("/contestants");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Registration failed");
      setState("idle");
    }
  }

  return (
    <div className="container py-14 md:py-20 max-w-md">
      <Badge variant="outline" className="mb-3">Fan account</Badge>
      <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
        Cheer them <span className="gradient-text">on</span>.
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Free fan account — like, follow, and comment on contestants you
        believe in.
      </p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <div>
          <Label htmlFor="fullName">Full name</Label>
          <Input
            id="fullName"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            required
            minLength={2}
            maxLength={120}
            autoComplete="name"
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            autoComplete="email"
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            minLength={8}
            autoComplete="new-password"
            className="mt-1.5"
          />
          <p className="text-xs text-muted-foreground mt-1.5">
            At least 8 characters.
          </p>
        </div>

        {error && (
          <p className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
            {error}
          </p>
        )}

        <Button
          type="submit"
          variant="gradient"
          size="lg"
          className="w-full"
          disabled={state === "submitting"}
        >
          {state === "submitting" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Create fan account <ArrowRight className="ml-1.5 h-4 w-4" />
            </>
          )}
        </Button>
      </form>

      <div className="mt-6 text-sm text-muted-foreground space-y-1">
        <p>
          Already have an account?{" "}
          <Link href="/login" className="underline hover:text-foreground">
            Sign in
          </Link>
        </p>
        <p>
          Want to compete instead?{" "}
          <Link href="/register" className="underline hover:text-foreground">
            Apply as a contestant
          </Link>
        </p>
      </div>
    </div>
  );
}
