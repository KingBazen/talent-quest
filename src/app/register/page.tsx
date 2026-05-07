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
  Lock,
  CreditCard,
  Trophy,
  Copy,
  ShieldAlert,
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

const schema = z
  .object({
    fullName: z.string().min(2, "Please enter your full name"),
    stageName: z.string().optional(),
    email: z.string().email("Enter a valid email"),
    password: z
      .string()
      .min(8, "At least 8 characters")
      .max(72, "Maximum 72 characters"),
    phone: z
      .string()
      .min(9, "Enter a valid phone number")
      .regex(/^[\d+\-\s()]+$/, "Numbers only"),
    dob: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date format YYYY-MM-DD")
      .refine((v) => {
        const d = new Date(v);
        return !isNaN(d.getTime()) && d < new Date();
      }, "Date must be in the past")
      .refine((v) => {
        const age = ageFromDob(v);
        return age >= 13 && age <= 99;
      }, "You must be between 13 and 99"),
    city: z.string().min(2, "Where are you based?"),
    country: z.string().min(2).max(64).default("ET"),
    category: z.enum(
      ["rap", "singing", "songwriter", "performance", "instruments", "other"],
      { errorMap: () => ({ message: "Pick your music category" }) }
    ),
    experience: z.string().min(1, "Tell us your level"),
    bio: z.string().min(20, "Add a short bio (at least 20 characters)").max(500),
    socialIg: z.string().max(120).optional().or(z.literal("")),
    socialTt: z.string().max(120).optional().or(z.literal("")),
    socialYt: z.string().max(120).optional().or(z.literal("")),
    agreedToRules: z
      .boolean()
      .refine((v) => v === true, { message: "You must accept the entry rules" }),
    agreedToRights: z
      .boolean()
      .refine((v) => v === true, {
        message: "You must accept the content licensing terms",
      }),
    agreedToAge: z
      .boolean()
      .refine((v) => v === true, {
        message: "You must confirm your age (and guardian permission if under 18)",
      }),
  });

type FormValues = z.infer<typeof schema>;

const TOTAL_STEPS = 3;
const DRAFT_KEY = "brs.register.draft.v1";

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
  const router = useRouter();
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
      email: "",
      password: "",
      phone: "",
      dob: "",
      city: "",
      country: "ET",
      category: undefined,
      experience: "",
      bio: "",
      socialIg: "",
      socialTt: "",
      socialYt: "",
      agreedToRules: false,
      agreedToRights: false,
      agreedToAge: false,
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

  // ─── LocalStorage save-resume (P2-T009) ────────────────────────────────────
  // Persist non-sensitive fields between page reloads. We deliberately exclude
  // `password` and `agreedTo*` so a shared device doesn't auto-resume into a
  // pre-checked consent state.
  const SENSITIVE: (keyof FormValues)[] = [
    "password",
    "agreedToRules",
    "agreedToRights",
    "agreedToAge",
  ];

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
    if (step === 1)
      fields = ["fullName", "email", "password", "phone", "dob", "city"];
    if (step === 2) fields = ["category", "experience", "bio"];
    const ok = await trigger(fields);
    if (!ok) return;
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
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
          age: ageFromDob(values.dob),
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
    return <SuccessCard contestant={submitted} />;
  }

  return (
    <div className="container py-10 md:py-16 max-w-3xl">
      <div className="mb-8">
        <Badge variant="outline" className="mb-3">
          <Sparkles className="h-3 w-3 mr-1 text-brand-500" />
          Live application · secure account
        </Badge>
        <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
          Apply to <span className="gradient-text">The Bling Records Show</span>.
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
            {step === 2 && "Your music"}
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
            <div className="grid sm:grid-cols-2 gap-5">
              <Field label="Email" error={errors.email?.message}>
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
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
            </div>
            <Field label="Phone" error={errors.phone?.message}>
              <Input
                type="tel"
                placeholder="+251 9XX XX XX XX"
                {...register("phone")}
              />
            </Field>
            <div className="grid sm:grid-cols-2 gap-5">
              <Field
                label="Date of birth"
                hint={
                  computedAge !== null
                    ? `Age ${computedAge}${isMinor ? " — guardian consent required" : ""}`
                    : "YYYY-MM-DD"
                }
                error={errors.dob?.message}
              >
                <Input
                  type="date"
                  inputMode="numeric"
                  {...register("dob")}
                />
              </Field>
              <Field label="City" error={errors.city?.message}>
                <Input placeholder="Addis Ababa" {...register("city")} />
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
                  <SelectValue placeholder="Pick your category" />
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
                value={watched.experience}
                onValueChange={(v) =>
                  setValue("experience", v, { shouldValidate: true })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="How long have you been performing?" />
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
              hint="What makes your sound yours? (20–500 chars)"
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
              <p className="text-sm font-semibold mb-3">Quick review</p>
              <dl className="grid sm:grid-cols-2 gap-3 text-sm">
                {[
                  ["Name", watched.fullName],
                  ["Stage name", watched.stageName || "—"],
                  ["Email", watched.email],
                  ["Phone", watched.phone],
                  [
                    "DOB · age",
                    watched.dob
                      ? `${watched.dob} · ${ageFromDob(watched.dob)}`
                      : "—",
                  ],
                  ["City", watched.city],
                  ["Category", selectedCat?.name],
                  ["Experience", watched.experience],
                ].map(([k, v]) => (
                  <div
                    key={String(k)}
                    className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-background px-3 py-2"
                  >
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="font-medium text-right">
                      {String(v ?? "—")}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 text-sm flex gap-3">
              <ShieldAlert className="h-5 w-5 shrink-0 text-emerald-500 mt-0.5" />
              <div className="space-y-2">
                <p className="font-semibold">Your data is secured</p>
                <ul className="space-y-1 text-muted-foreground list-disc pl-4">
                  <li>Password hashed with bcrypt; never stored in plain text.</li>
                  <li>Session cookie is HTTP-only, signed with HS256 JWT.</li>
                  <li>
                    Registration is free. The 500 ETB audition fee is paid
                    after sign-up — before you can upload your video.
                  </li>
                </ul>
              </div>
            </div>

            <div className="space-y-3">
              <Field error={errors.agreedToRules?.message}>
                <Checkbox
                  checked={watched.agreedToRules}
                  onChange={(e) =>
                    setValue("agreedToRules", e.target.checked, {
                      shouldValidate: true,
                    })
                  }
                  label={
                    <span>
                      I agree to The Bling Records Show entry rules and
                      eligibility terms.
                    </span>
                  }
                />
              </Field>
              <Field error={errors.agreedToRights?.message}>
                <Checkbox
                  checked={watched.agreedToRights}
                  onChange={(e) =>
                    setValue("agreedToRights", e.target.checked, {
                      shouldValidate: true,
                    })
                  }
                  label={
                    <span>
                      I license my audition video for review, broadcast, and
                      promotional use as set out in the content licensing
                      terms.
                    </span>
                  }
                />
              </Field>
              <Field error={errors.agreedToAge?.message}>
                <Checkbox
                  checked={watched.agreedToAge}
                  onChange={(e) =>
                    setValue("agreedToAge", e.target.checked, {
                      shouldValidate: true,
                    })
                  }
                  label={
                    isMinor ? (
                      <span>
                        I confirm I am 13 or older <strong>and</strong> have
                        my parent or legal guardian&apos;s permission to apply.
                      </span>
                    ) : (
                      <span>I confirm I am 18 or older.</span>
                    )
                  }
                />
              </Field>
            </div>

            {serverError && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                {serverError}
              </p>
            )}

            <div className="grid sm:grid-cols-3 gap-3 text-xs text-muted-foreground">
              <FuturePill icon={Lock} label="Bcrypt + JWT auth" />
              <FuturePill icon={CreditCard} label="Fee at shortlist" />
              <FuturePill icon={Trophy} label="Persisted scoring" />
            </div>
          </motion.div>
        )}

        <div className="flex items-center justify-between gap-3">
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
            <Button type="button" variant="gradient" onClick={next}>
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              variant="gradient"
              size="lg"
              disabled={isSubmitting}
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

function FuturePill({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/40 px-3 py-2 flex items-center gap-2">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </div>
  );
}

function SuccessCard({ contestant }: { contestant: ContestantDTO }) {
  const [copied, setCopied] = React.useState(false);
  const router = useRouter();

  function copyId() {
    navigator.clipboard?.writeText(contestant.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="container py-16 max-w-2xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-3xl border border-border/60 bg-card p-8 md:p-10 text-center stage-glow"
      >
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-white mx-auto">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h1 className="mt-5 font-display text-3xl md:text-4xl font-bold">
          You&apos;re on the stage list, {contestant.fullName.split(" ")[0]}.
        </h1>
        <p className="mt-2 text-muted-foreground">
          This is your contestant ID. Save it — anyone can use it on the
          Result Checker.
        </p>
        <div className="mt-6 inline-flex items-center gap-3 rounded-2xl bg-muted px-5 py-3">
          <span className="font-mono text-3xl md:text-4xl font-bold tracking-widest gradient-text">
            {contestant.id}
          </span>
          <Button variant="outline" size="sm" onClick={copyId}>
            <Copy className="h-3.5 w-3.5 mr-1" />
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          IDs are unique 6-digit numbers, collision-checked at allocation.
        </p>

        <div className="grid sm:grid-cols-3 gap-3 mt-8 text-left">
          <Link
            href="/contestant/dashboard"
            className="rounded-xl border border-border/60 bg-background p-4 hover:border-brand-500/50 transition-colors"
          >
            <p className="text-sm font-semibold">Open dashboard</p>
            <p className="text-xs text-muted-foreground">
              Track your application + submission.
            </p>
          </Link>
          <Link
            href="/upload-guide"
            className="rounded-xl border border-border/60 bg-background p-4 hover:border-brand-500/50 transition-colors"
          >
            <p className="text-sm font-semibold">Audition guide</p>
            <p className="text-xs text-muted-foreground">
              Record a great submission.
            </p>
          </Link>
          <Link
            href="/result-checker"
            className="rounded-xl border border-border/60 bg-background p-4 hover:border-brand-500/50 transition-colors"
          >
            <p className="text-sm font-semibold">Result checker</p>
            <p className="text-xs text-muted-foreground">Try your ID now.</p>
          </Link>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-2 justify-center">
          <Button
            variant="gradient"
            onClick={() => router.push("/contestant/dashboard")}
          >
            Open my dashboard <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button variant="ghost" onClick={() => router.push("/")}>
            Back to home
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
