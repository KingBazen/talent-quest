"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import {
  Save,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  UserMinus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSession } from "@/components/auth/SessionProvider";
import { ContestantSubNav } from "@/components/contestant/SubNav";
import { api, ApiError } from "@/lib/client-api";
import type { ContestantDTO } from "@/lib/dto-types";
import { TALENT_CATEGORIES } from "@/data/categories";
import { useRouter } from "next/navigation";

const schema = z.object({
  stageName: z.string().max(60).optional().or(z.literal("")),
  phone: z
    .string()
    .min(9, "Enter a valid phone number")
    .regex(/^[\d+\-\s()]+$/, "Numbers only"),
  city: z.string().min(2, "City required"),
  country: z.string().min(2).max(64),
  bio: z
    .string()
    .min(20, "At least 20 characters")
    .max(500, "Maximum 500 characters"),
  experience: z.string().min(1, "Experience level required"),
  socialIg: z.string().max(120).optional().or(z.literal("")),
  socialTt: z.string().max(120).optional().or(z.literal("")),
  socialYt: z.string().max(120).optional().or(z.literal("")),
});

type Values = z.infer<typeof schema>;

export default function ContestantProfileEditPage() {
  const router = useRouter();
  const { user, contestant, loading, refresh, logout } = useSession();
  const [savedAt, setSavedAt] = React.useState<Date | null>(null);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [withdrawing, setWithdrawing] = React.useState(false);
  const [confirmWithdraw, setConfirmWithdraw] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<Values>({
    resolver: zodResolver(schema),
  });

  React.useEffect(() => {
    if (!contestant) return;
    reset({
      stageName: contestant.stageName ?? "",
      phone: contestant.phone,
      city: contestant.city,
      country: contestant.country,
      bio: contestant.bio,
      experience: contestant.experience,
      socialIg: contestant.socialIg ?? "",
      socialTt: contestant.socialTt ?? "",
      socialYt: contestant.socialYt ?? "",
    });
  }, [contestant, reset]);

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
        <Badge variant="outline" className="mb-3">No contestant session</Badge>
        <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
          Sign in to edit your profile.
        </h1>
        <Button asChild variant="gradient" size="lg" className="mt-6">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  async function onSubmit(values: Values) {
    setServerError(null);
    try {
      await api.patch<{ contestant: ContestantDTO }>(
        "/api/contestants/me",
        values
      );
      await refresh();
      setSavedAt(new Date());
    } catch (e) {
      setServerError(
        e instanceof ApiError ? e.message : "Could not save profile"
      );
    }
  }

  async function handleWithdraw() {
    setWithdrawing(true);
    try {
      await api.post("/api/contestants/me/withdraw");
      await logout();
      router.push("/");
      router.refresh();
    } catch (e) {
      setServerError(
        e instanceof ApiError ? e.message : "Could not withdraw account"
      );
      setWithdrawing(false);
    }
  }

  const watchedCity = watch("city");
  const cat = TALENT_CATEGORIES.find((c) => c.id === contestant.category);

  return (
    <div className="container py-10 md:py-14 max-w-3xl">
      <ContestantSubNav />

      <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">
        Edit your <span className="gradient-text">profile</span>.
      </h1>
      <p className="mt-2 text-muted-foreground">
        Update your phone, city, bio, and socials any time. DOB, age, name,
        and category are locked after registration — contact support if those
        need to change.
      </p>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-8 rounded-2xl border border-border/60 bg-card p-6 space-y-5"
      >
        <div className="grid sm:grid-cols-2 gap-5 text-sm">
          <Locked label="Full name" v={contestant.fullName} />
          <Locked label="Email" v={contestant.email} />
          <Locked
            label="Date of birth"
            v={contestant.dob ?? "(not on file)"}
          />
          <Locked label="Age" v={String(contestant.age)} />
          <Locked label="Category" v={cat?.name ?? contestant.category} />
        </div>

        <hr className="border-border/40" />

        <Field label="Stage name" hint="Optional">
          <Input
            placeholder="(optional)"
            {...register("stageName")}
          />
        </Field>
        <div className="grid sm:grid-cols-2 gap-5">
          <Field label="Phone" error={errors.phone?.message}>
            <Input
              type="tel"
              placeholder="+251 9XX XX XX XX"
              {...register("phone")}
            />
          </Field>
          <Field label="City" error={errors.city?.message}>
            <Input placeholder="Addis Ababa" {...register("city")} />
          </Field>
        </div>
        <Field label="Country" error={errors.country?.message}>
          <Input placeholder="ET" {...register("country")} />
        </Field>

        <Field label="Experience level" error={errors.experience?.message}>
          <Select
            value={watch("experience") || ""}
            onValueChange={(v) =>
              setValue("experience", v, { shouldValidate: true, shouldDirty: true })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Pick your experience level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beginner">Beginner — under 1 year</SelectItem>
              <SelectItem value="intermediate">
                Intermediate — 1 to 3 years
              </SelectItem>
              <SelectItem value="advanced">Advanced — 3 to 7 years</SelectItem>
              <SelectItem value="pro">Pro — 7+ years / paid gigs</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field
          label="Bio"
          hint="20–500 characters"
          error={errors.bio?.message}
        >
          <Textarea rows={5} {...register("bio")} />
          <div className="text-right text-[11px] text-muted-foreground mt-1">
            {watch("bio")?.length || 0}/500
          </div>
        </Field>

        <div className="rounded-xl border border-border/60 bg-background p-4 space-y-3">
          <p className="text-sm font-semibold">Socials</p>
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label="Instagram">
              <Input
                placeholder="@handle or URL"
                {...register("socialIg")}
              />
            </Field>
            <Field label="TikTok">
              <Input
                placeholder="@handle or URL"
                {...register("socialTt")}
              />
            </Field>
            <Field label="YouTube">
              <Input
                placeholder="channel or URL"
                {...register("socialYt")}
              />
            </Field>
          </div>
        </div>

        {serverError && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
            {serverError}
          </p>
        )}

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {savedAt && (
              <span className="inline-flex items-center gap-1 text-emerald-500">
                <CheckCircle2 className="h-3 w-3" />
                Saved {savedAt.toLocaleTimeString()}
              </span>
            )}
            {!savedAt && watchedCity && isDirty && "Unsaved changes"}
          </p>
          <Button
            type="submit"
            variant="gradient"
            disabled={isSubmitting || !isDirty}
          >
            {isSubmitting ? "Saving…" : "Save changes"}
            <Save className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </form>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-10 rounded-2xl border border-destructive/30 bg-destructive/5 p-6"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-destructive mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold">Withdraw your application</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              This signs you out and prevents future logins for this account.
              Your scores and audit history are preserved for our records, but
              you won&apos;t appear in showcases or new round considerations.
              You cannot undo this from the UI.
            </p>
            {!confirmWithdraw ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3 border-destructive text-destructive hover:bg-destructive/10"
                onClick={() => setConfirmWithdraw(true)}
              >
                <UserMinus className="h-4 w-4 mr-1.5" />
                Withdraw…
              </Button>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmWithdraw(false)}
                  disabled={withdrawing}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="bg-destructive text-white hover:bg-destructive/90"
                  onClick={handleWithdraw}
                  disabled={withdrawing}
                >
                  {withdrawing ? "Withdrawing…" : "Yes — withdraw my application"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label?: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <Label className="text-sm font-semibold">
          {label}
          {hint && (
            <span className="ml-1 text-xs text-muted-foreground font-normal">
              · {hint}
            </span>
          )}
        </Label>
      )}
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function Locked({ label, v }: { label: string; v: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label} · locked
      </p>
      <p className="font-medium">{v}</p>
    </div>
  );
}
