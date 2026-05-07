"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { KeyRound, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { api, ApiError } from "@/lib/client-api";

const schema = z
  .object({
    password: z
      .string()
      .min(8, "At least 8 characters")
      .max(72, "Maximum 72 characters"),
    confirm: z.string().min(1, "Confirm the new password"),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "Passwords don't match",
  });

type Values = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  return (
    <React.Suspense
      fallback={
        <div className="container py-20 text-center text-muted-foreground">
          Loading…
        </div>
      }
    >
      <ResetPasswordInner />
    </React.Suspense>
  );
}

function ResetPasswordInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [done, setDone] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  async function onSubmit(values: Values) {
    setServerError(null);
    try {
      await api.post<{ reset: true }>("/api/auth/reset-password", {
        token,
        password: values.password,
      });
      setDone(true);
    } catch (e) {
      setServerError(
        e instanceof ApiError ? e.message : "Could not reset password"
      );
    }
  }

  if (!token) {
    return (
      <div className="container py-16 max-w-md text-center">
        <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-destructive text-white mb-2">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="font-display text-2xl font-bold">No reset token</h1>
        <p className="mt-2 text-muted-foreground">
          This page needs a token in the URL — open the link from your reset
          email, or request a new one.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <Button asChild variant="gradient">
            <Link href="/forgot-password">Request a new link</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/login">Back to login</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="container py-16 max-w-md text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-8"
        >
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white mb-2">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h1 className="font-display text-2xl font-bold">Password updated</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You can now sign in with your new password.
          </p>
          <Button
            variant="gradient"
            className="mt-5"
            onClick={() => router.push("/login")}
          >
            Sign in
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container py-16 max-w-md">
      <Badge variant="outline" className="mb-3">Set a new password</Badge>
      <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
        New <span className="gradient-text">password</span>.
      </h1>
      <p className="mt-3 text-muted-foreground">
        Pick something you haven&apos;t used elsewhere. We hash it with bcrypt
        and never store the plain text.
      </p>

      <motion.form
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit(onSubmit)}
        className="mt-8 rounded-2xl border border-border/60 bg-card p-6 space-y-4"
      >
        <div>
          <Label className="text-sm font-semibold">New password</Label>
          <Input
            className="mt-1.5"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs text-destructive mt-1">
              {errors.password.message}
            </p>
          )}
        </div>
        <div>
          <Label className="text-sm font-semibold">Confirm new password</Label>
          <Input
            className="mt-1.5"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            {...register("confirm")}
          />
          {errors.confirm && (
            <p className="text-xs text-destructive mt-1">
              {errors.confirm.message}
            </p>
          )}
        </div>
        {serverError && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
            {serverError}
          </p>
        )}
        <Button
          type="submit"
          variant="gradient"
          size="lg"
          disabled={isSubmitting}
          className="w-full"
        >
          {isSubmitting ? "Updating…" : "Update password"}
          <KeyRound className="ml-2 h-4 w-4" />
        </Button>
      </motion.form>
    </div>
  );
}
