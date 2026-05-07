"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { LogIn, Sparkles, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { api, ApiError } from "@/lib/client-api";
import { useSession } from "@/components/auth/SessionProvider";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

type Values = z.infer<typeof schema>;

export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <div className="container py-20 text-center text-muted-foreground">
          Loading…
        </div>
      }
    >
      <LoginInner />
    </React.Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/contestant/dashboard";
  const { refresh } = useSession();
  const [error, setError] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  async function onSubmit(values: Values) {
    setError(null);
    try {
      const data = await api.post<{
        user: { role: "contestant" | "referee" | "admin" };
      }>("/api/auth/login", values);
      await refresh();
      const target =
        data.user.role === "admin"
          ? "/admin"
          : data.user.role === "referee"
          ? "/referee"
          : next;
      router.push(target);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Login failed");
    }
  }

  return (
    <div className="container py-16 max-w-md">
      <Badge variant="outline" className="mb-3">
        <ShieldCheck className="h-3 w-3 mr-1 text-brand-500" />
        Secure login · JWT session
      </Badge>
      <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
        Welcome <span className="gradient-text">back</span>.
      </h1>
      <p className="mt-3 text-muted-foreground">
        Sign in with the email you used to register. Admin and referee
        accounts use the same form.
      </p>

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
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-destructive mt-1">
              {errors.email.message}
            </p>
          )}
        </div>
        <div>
          <Label className="text-sm font-semibold">Password</Label>
          <Input
            className="mt-1.5"
            type="password"
            autoComplete="current-password"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs text-destructive mt-1">
              {errors.password.message}
            </p>
          )}
        </div>
        {error && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        <Button
          type="submit"
          variant="gradient"
          size="lg"
          disabled={isSubmitting}
          className="w-full"
        >
          {isSubmitting ? "Signing in…" : "Sign in"}
          <LogIn className="ml-2 h-4 w-4" />
        </Button>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <Link
            className="hover:text-foreground"
            href="/forgot-password"
          >
            Forgot password?
          </Link>
          <Link
            className="text-foreground underline hover:text-brand-500"
            href="/register"
          >
            No account? Apply
          </Link>
        </div>
      </motion.form>

      {process.env.NODE_ENV !== "production" && (
        <div className="mt-6 rounded-xl bg-muted/40 border border-border/60 p-4 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground mb-1">
            <Sparkles className="inline h-3 w-3 mr-1" /> Seeded dev accounts
          </p>
          <ul className="space-y-1 font-mono">
            <li>admin@example.local / (SEED_ADMIN_PASSWORD)</li>
            <li>referee@example.local / (SEED_REFEREE_PASSWORD)</li>
            <li>hanna@example.com / Demo1234!</li>
          </ul>
          <p className="mt-2">
            Visible in development only. Set strong passwords via SEED_*_PASSWORD env vars.
          </p>
        </div>
      )}
    </div>
  );
}
