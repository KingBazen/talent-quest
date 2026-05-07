"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Mail, Send, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { api, ApiError } from "@/lib/client-api";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
});

type Values = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    getValues,
  } = useForm<Values>({ resolver: zodResolver(schema) });

  async function onSubmit(values: Values) {
    setServerError(null);
    try {
      await api.post<{ sent: true }>("/api/auth/forgot-password", values);
      setSent(true);
    } catch (e) {
      setServerError(
        e instanceof ApiError ? e.message : "Could not send reset link"
      );
    }
  }

  return (
    <div className="container py-16 max-w-md">
      <Badge variant="outline" className="mb-3">Password reset</Badge>
      <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
        Forgot your <span className="gradient-text">password</span>?
      </h1>
      <p className="mt-3 text-muted-foreground">
        Enter the email you registered with — we&apos;ll send a one-time link
        you can use to set a new password. Links expire after 30 minutes.
      </p>

      {sent ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center"
        >
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white mb-2">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h2 className="font-display text-xl font-bold">Check your inbox</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            If an account exists for{" "}
            <span className="font-mono">{getValues("email")}</span>, a
            password-reset link is on its way. The link expires in 30 minutes.
          </p>
          <Button asChild variant="ghost" className="mt-4">
            <Link href="/login">
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to login
            </Link>
          </Button>
        </motion.div>
      ) : (
        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit(onSubmit)}
          className="mt-8 rounded-2xl border border-border/60 bg-card p-6 space-y-4"
        >
          <div>
            <Label className="text-sm font-semibold">Email</Label>
            <Input
              className="mt-1.5"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive mt-1">
                {errors.email.message}
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
            {isSubmitting ? "Sending…" : "Send reset link"}
            <Send className="ml-2 h-4 w-4" />
          </Button>
          <div className="flex items-center justify-between text-sm text-muted-foreground pt-1">
            <Link
              href="/login"
              className="inline-flex items-center hover:text-foreground"
            >
              <ArrowLeft className="h-3 w-3 mr-1" /> Back to login
            </Link>
            <Link
              href="/register"
              className="hover:text-foreground"
            >
              No account? Apply
            </Link>
          </div>
        </motion.form>
      )}

      <div className="mt-6 rounded-xl bg-muted/40 border border-border/60 p-4 text-xs text-muted-foreground">
        <p className="flex items-center gap-1.5">
          <Mail className="h-3 w-3" />
          We&apos;ll never email you a request to install software, send money, or
          share a password. If a message looks off, it&apos;s not from us.
        </p>
      </div>
    </div>
  );
}
