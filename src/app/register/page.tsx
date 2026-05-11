"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  Pencil,
  Copy,
  ShieldAlert,
  CreditCard,
  Video,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { TALENT_CATEGORIES } from "@/data/categories";
import { api, ApiError } from "@/lib/client-api";
import { useSession } from "@/components/auth/SessionProvider";
import type { ContestantDTO } from "@/lib/dto-types";
import type { TalentCategoryId } from "@/types";

// ─── Schema ──────────────────────────────────────────────────────────────────
//
// Stakeholder-driven shape (Ethiopian market): phone is the primary identifier
// because most contestants don't have email. Email, DOB, city, and the entire
// step-2 "your music" block are optional so users can sign up fast and fill in
// the rest from their profile page later.

const schema = z.object({
  fullName: z.string().min(2, "Please enter your full name"),
  stageName: z.string().optional(),
  phone: z
    .string()
    .min(9, "Enter a valid phone number")
    .regex(/^[\d+\-\s()]+$/, "Numbers only"),
  email: z
    .string()
    .email("Enter a valid email")
    .optional()
    .or(z.literal("")),
  password: z
    .string()
    .min(8, "At least 8 characters")
    .max(72, "Maximum 72 characters"),
  dob: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine(
      (v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v),
      "Date format YYYY-MM-DD"
    )
    .refine((v) => {
      if (!v) return true;
      const d = new Date(v);
      return !isNaN(d.getTime()) && d < new Date();
    }, "Date must be in the past")
    .refine((v) => {
      if (!v) return true;
      const age = ageFromDob(v);
      return age >= 13 && age <= 99;
    }, "You must be between 13 and 99"),
  city: z.string().optional().or(z.literal("")),
  country: z.string().min(2).max(64).default("ET"),
  category: z
    .enum(["rap", "singing", "songwriter", "performance", "instruments", "other"])
    .optional(),
  experience: z.string().optional().or(z.literal("")),
  bio: z
    .string()
    .max(500, "Maximum 500 characters")
    .optional()
    .or(z.literal("")),
  socialIg: z.string().max(120).optional().or(z.literal("")),
  socialTt: z.string().max(120).optional().or(z.literal("")),
  socialYt: z.string().max(120).optional().or(z.literal("")),
  agreedToTerms: z
    .boolean()
    .refine((v) => v === true, {
      message: "Please confirm you agree to all the terms below",
    }),
});

type FormValues = z.infer<typeof schema>;

const TOTAL_STEPS = 3;
const DRAFT_KEY = "brs.register.draft.v2";

function ageFromDob(dob: string): number {
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const { refresh } = useSession();
  const [step, setStep] = React.useState(1);
  const [submitted, setSubmitted] = React.useState<ContestantDTO | null>(null);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      fullName: "",
      stageName: "",
      phone: "",
      email: "",
      password: "",
      dob: "",
      city: "",
      country: "ET",
      category: undefined,
      experience: "",
      bio: "",
      socialIg: "",
      socialTt: "",
      socialYt: "",
      agreedToTerms: false,
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    trigger,
    setValue,
    watch,
    reset,
    getValues,
  } = form;

  // ─── LocalStorage save-resume ──────────────────────────────────────────────
  // Persist non-sensitive fields between page reloads. We deliberately exclude
  // `password` and the consent flag so a shared device doesn't auto-resume
  // into a pre-checked consent state.
  const SENSITIVE: (keyof FormValues)[] = ["password", "agreedToTerms"];

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as Partial<FormValues>;
      const safe: Partial<FormValues> = { ...draft };
      for (const k of SENSITIVE) delete safe[k];
      reset({ ...getValues(), ...safe } as FormValues);
    } catch {
      /* corrupt draft — ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const sub = watch((v) => {
      if (typeof window === "undefined") return;
      const safe: Record<string, unknown> = { ...v };
      for (const k of SENSITIVE) delete safe[k];
      try {
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify(safe));
      } catch {
        /* quota / private mode — ignore */
      }
    });
    return () => sub.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watch]);

  function clearDraft() {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
  }

  // ─── Step navigation ───────────────────────────────────────────────────────
  async function next() {
    let fields: (keyof FormValues)[] = [];
    if (step === 1) fields = ["fullName", "phone", "password", "email", "dob"];
    // Step 2 has no required fields — the "Skip for now" path uses skip().
    if (step === 2) fields = ["bio"];
    const ok = await trigger(fields);
    if (!ok) return;
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }

  function skipStep2() {
    setValue("category", undefined);
    setValue("experience", "");
    setValue("bio", "");
    setValue("socialIg", "");
    setValue("socialTt", "");
    setValue("socialYt", "");
    setStep(3);
  }

  function back() {
    setStep((s) => Math.max(s - 1, 1));
  }

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      const res = await api.post<{ contestant: ContestantDTO }>(
        "/api/auth/register",
        {
          ...values,
          age: values.dob ? ageFromDob(values.dob) : undefined,
        }
      );
      await refresh();
      clearDraft();
      setSubmitted(res.contestant);
    } catch (e) {
      setServerError(
        e instanceof ApiError ? e.message : "Registration failed"
      );
    }
  }

  const watched = watch();
  const selectedCat = TALENT_CATEGORIES.find((c) => c.id === watched.category);
  const computedAge = watched.dob ? ageFromDob(watched.dob) : null;
  const isMinor = computedAge !== null && computedAge < 18;

  if (submitted) {
    return <SuccessJourney contestant={submitted} />;
  }

  return (
    <div className="container py-10 md:py-16 max-w-3xl">
      <div className="mb-8">
        <Badge variant="outline" className="mb-3">
          <Sparkles className="h-3 w-3 mr-1 text-brand-500" />
          Live application · secure account
        </Badge>
        <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
          Apply to <span className="gradient-text">The Bling Records Talent Show</span>.
        </h1>
        <p className="mt-3 text-muted-foreground">
          Three short steps. Your 6-digit contestant ID is created instantly
          and tied to your account so you can log back in any time.
        </p>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between text-xs font-semibold mb-2">
          <span>Step {step} of {TOTAL_STEPS}</span>
          <span className="text-muted-foreground">
            {step === 1 && "About you"}
            {step === 2 && "Your music (optional)"}
            {step === 3 && "Confirm & submit"}
          </span>
        </div>
        <Progress value={(step / TOTAL_STEPS) * 100} />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border/60 bg-card p-6 space-y-5"
          >
            <Field label="Full name" error={errors.fullName?.message}>
              <Input placeholder="Hanna Tesfaye" {...register("fullName")} />
            </Field>
            <Field
              label="Stage name"
              hint="Optional — what should the audience call you?"
            >
              <Input placeholder="(optional)" {...register("stageName")} />
            </Field>
            <Field
              label="Phone"
              hint="We use this to log you in and send updates"
              error={errors.phone?.message}
            >
              <Input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+251 9XX XX XX XX"
                {...register("phone")}
              />
            </Field>
            <Field
              label="Email"
              hint="Optional — add it if you want updates by email too"
              error={errors.email?.message}
            >
              <Input
                type="email"
                autoComplete="email"
                placeholder="you@example.com (optional)"
                {...register("email")}
              />
            </Field>
            <Field
              label="Password"
              hint="8+ characters"
              error={errors.password?.message}
            >
              <Input
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                {...register("password")}
              />
            </Field>
            <div className="grid sm:grid-cols-2 gap-5">
              <Field
                label="Date of birth"
                hint={
                  computedAge !== null
                    ? `Age ${computedAge}${isMinor ? " — guardian consent required" : ""}`
                    : "Optional · YYYY-MM-DD"
                }
                error={errors.dob?.message}
              >
                <Input
                  type="date"
                  inputMode="numeric"
                  {...register("dob")}
                />
              </Field>
              <Field
                label="City"
                hint="Optional — where are you based?"
                error={errors.city?.message}
              >
                <Input placeholder="Addis Ababa (optional)" {...register("city")} />
              </Field>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border/60 bg-card p-6 space-y-5"
          >
            <div className="rounded-xl bg-muted/40 border border-border/60 px-4 py-3 text-xs text-muted-foreground">
              All fields here are optional. You can skip for now and finish
              your profile later from the dashboard.
            </div>

            <Field
              label="Music category"
              hint="Pick the one your strongest performance lives in"
              error={errors.category?.message}
            >
              <Select
                value={watched.category}
                onValueChange={(v) =>
                  setValue("category", v as TalentCategoryId, {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pick your category (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {TALENT_CATEGORIES.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="mr-2">{c.emoji}</span> {c.name} —{" "}
                      <span className="text-muted-foreground">
                        {c.amharicName}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedCat && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {selectedCat.description}
                </p>
              )}
            </Field>

            <Field label="Experience level" error={errors.experience?.message}>
              <Select
                value={watched.experience || ""}
                onValueChange={(v) =>
                  setValue("experience", v, { shouldValidate: true })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="How long have you been performing? (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">
                    Beginner — under 1 year
                  </SelectItem>
                  <SelectItem value="intermediate">
                    Intermediate — 1 to 3 years
                  </SelectItem>
                  <SelectItem value="advanced">
                    Advanced — 3 to 7 years
                  </SelectItem>
                  <SelectItem value="pro">
                    Pro — 7+ years / paid gigs
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field
              label="Short bio"
              hint="Optional — what makes your sound yours? (up to 500 chars)"
              error={errors.bio?.message}
            >
              <Textarea
                rows={5}
                placeholder="I'm a 22-year-old singer-songwriter from Addis Ababa…"
                {...register("bio")}
              />
              <div className="text-right text-[11px] text-muted-foreground mt-1">
                {watched.bio?.length || 0}/500
              </div>
            </Field>

            <div className="rounded-xl border border-border/60 bg-background p-4 space-y-3">
              <p className="text-sm font-semibold">
                Socials (optional — helps the panel see more of your work)
              </p>
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
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border/60 bg-card p-6 space-y-5"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold">Quick review</p>
                <p className="text-xs text-muted-foreground">
                  Tap any row to edit
                </p>
              </div>
              <dl className="grid sm:grid-cols-2 gap-3 text-sm">
                <ReviewRow
                  label="Name"
                  value={watched.fullName}
                  onEdit={() => setStep(1)}
                />
                <ReviewRow
                  label="Stage name"
                  value={watched.stageName || "—"}
                  onEdit={() => setStep(1)}
                />
                <ReviewRow
                  label="Phone"
                  value={watched.phone}
                  onEdit={() => setStep(1)}
                />
                <ReviewRow
                  label="Email"
                  value={watched.email || "(optional — not provided)"}
                  onEdit={() => setStep(1)}
                />
                <ReviewRow
                  label="DOB · age"
                  value={
                    watched.dob
                      ? `${watched.dob} · ${ageFromDob(watched.dob)}`
                      : "—"
                  }
                  onEdit={() => setStep(1)}
                />
                <ReviewRow
                  label="City"
                  value={watched.city || "—"}
                  onEdit={() => setStep(1)}
                />
                <ReviewRow
                  label="Category"
                  value={selectedCat?.name || "—"}
                  onEdit={() => setStep(2)}
                />
                <ReviewRow
                  label="Experience"
                  value={watched.experience || "—"}
                  onEdit={() => setStep(2)}
                />
              </dl>
            </div>

            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 text-sm flex gap-3">
              <ShieldAlert className="h-5 w-5 shrink-0 text-emerald-500 mt-0.5" />
              <div className="space-y-2">
                <p className="font-semibold">Your data is secured</p>
                <p className="text-muted-foreground">
                  Registration is free. The 500 ETB audition fee is paid
                  after sign-up — before you can upload your video.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-background p-5 space-y-4">
              <p className="text-sm font-semibold">By creating your account, you agree to:</p>
              <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
                <li>
                  The Bling Records Talent Show <Link href="/terms" target="_blank" className="underline hover:text-foreground">entry rules</Link> and eligibility terms.
                </li>
                <li>
                  The <Link href="/content-rights" target="_blank" className="underline hover:text-foreground">content licensing terms</Link> — you allow your audition video to be reviewed, broadcast, and used for show promotion.
                </li>
                <li>
                  {isMinor
                    ? "Confirming you are 13 or older AND that your parent or legal guardian has given permission for you to apply."
                    : "Confirming you are 18 or older (13–17 must have a parent or legal guardian's permission)."}
                </li>
              </ul>
              <Field error={errors.agreedToTerms?.message}>
                <Checkbox
                  checked={watched.agreedToTerms}
                  onChange={(e) =>
                    setValue("agreedToTerms", e.target.checked, {
                      shouldValidate: true,
                    })
                  }
                  label={
                    <span className="text-foreground">
                      I have read and agree to all of the above.
                    </span>
                  }
                />
              </Field>
            </div>

            {serverError && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                {serverError}
              </p>
            )}
          </motion.div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          {step > 1 ? (
            <Button type="button" variant="outline" onClick={back}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          ) : (
            <Link
              href="/"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Cancel
            </Link>
          )}
          {step < TOTAL_STEPS ? (
            <div className="flex items-center gap-2 ml-auto">
              {step === 2 && (
                <Button type="button" variant="ghost" onClick={skipStep2}>
                  Skip for now
                </Button>
              )}
              <Button type="button" variant="gradient" onClick={next}>
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              type="submit"
              variant="gradient"
              size="lg"
              disabled={isSubmitting}
              className="ml-auto"
            >
              {isSubmitting ? "Creating account…" : "Create my account"}
              <Sparkles className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </form>
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

function ReviewRow({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: string | undefined;
  onEdit: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onEdit}
      className="group flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-background px-3 py-2 text-left transition-colors hover:border-brand-500/50 hover:bg-brand-500/5"
    >
      <div className="min-w-0">
        <span className="block text-[11px] uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="block font-medium truncate">
          {value || "—"}
        </span>
      </div>
      <Pencil className="h-3.5 w-3.5 shrink-0 mt-1 text-muted-foreground group-hover:text-brand-500" />
    </button>
  );
}

// ─── Success: 3-step journey card ────────────────────────────────────────────
//
// After registration we want every user — especially first-time web users in
// Ethiopia — to see exactly what comes next. So instead of a generic "you're
// in" screen we show the same three-step journey as the homepage with step 1
// marked complete and step 2 highlighted as the next action.

function SuccessJourney({ contestant }: { contestant: ContestantDTO }) {
  const [copied, setCopied] = React.useState(false);
  const router = useRouter();

  function copyId() {
    navigator.clipboard?.writeText(contestant.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="container py-12 md:py-16 max-w-4xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-3xl border border-border/60 bg-card p-6 md:p-10 text-center stage-glow"
      >
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white mx-auto">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h1 className="mt-5 font-display text-3xl md:text-4xl font-bold">
          Step 1 complete, {contestant.fullName.split(" ")[0]}!
        </h1>
        <p className="mt-2 text-muted-foreground">
          Your account is created. Save your contestant ID — anyone can use it
          on the Result Checker.
        </p>
        <div className="mt-5 inline-flex items-center gap-3 rounded-2xl bg-muted px-5 py-3">
          <span className="font-mono text-3xl md:text-4xl font-bold tracking-widest gradient-text">
            {contestant.id}
          </span>
          <Button variant="outline" size="sm" onClick={copyId}>
            <Copy className="h-3.5 w-3.5 mr-1" />
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>

        <div className="mt-8 grid sm:grid-cols-3 gap-3 text-left">
          <JourneyCard
            n="1"
            title="Register"
            body="Account created and 6-digit ID assigned."
            done
          />
          <JourneyCard
            n="2"
            title="Pay 500 ETB"
            body="AdmasPay or upload a bank-transfer receipt. Required before you can upload your video."
            current
            cta="Pay audition fee"
            href="/contestant/payment"
            icon={CreditCard}
          />
          <JourneyCard
            n="3"
            title="Upload your audition"
            body="60–180 seconds. Phone-shot is fine. Available after your payment is confirmed."
            cta="See upload guide"
            href="/upload-guide"
            icon={Video}
          />
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-2 justify-center">
          <Button
            variant="gradient"
            size="lg"
            onClick={() => router.push("/contestant/payment")}
          >
            Continue to payment <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => router.push("/contestant/profile")}
          >
            <UserCheck className="mr-2 h-4 w-4" />
            Complete your profile
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

function JourneyCard({
  n,
  title,
  body,
  done,
  current,
  cta,
  href,
  icon: Icon,
}: {
  n: string;
  title: string;
  body: string;
  done?: boolean;
  current?: boolean;
  cta?: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div
      className={`relative rounded-2xl border p-5 ${
        done
          ? "border-emerald-500/40 bg-emerald-500/5"
          : current
          ? "border-brand-500 bg-brand-500/5 ring-2 ring-brand-500/20"
          : "border-border/60 bg-background"
      }`}
    >
      <span
        className={`absolute -top-3 right-4 rounded-full px-3 py-1 text-xs font-bold text-white ${
          done
            ? "bg-emerald-500"
            : current
            ? "bg-gradient-to-r from-brand-400 to-brand-600"
            : "bg-muted-foreground/60"
        }`}
      >
        {done ? "✓" : n}
      </span>
      {Icon && (
        <div
          className={`inline-flex h-10 w-10 items-center justify-center rounded-xl mb-3 ${
            current
              ? "bg-brand-500/15 text-brand-500"
              : "bg-muted text-muted-foreground"
          }`}
        >
          <Icon className="h-4 w-4" />
        </div>
      )}
      <h3 className="font-display text-lg font-bold flex items-center gap-2">
        {title}
        {current && (
          <Badge variant="gradient" className="text-[10px]">
            Next step
          </Badge>
        )}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      {cta && href && (
        <Button
          asChild
          size="sm"
          variant={current ? "gradient" : "outline"}
          className="mt-3"
        >
          <Link href={href}>
            {cta}
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
      )}
    </div>
  );
}
