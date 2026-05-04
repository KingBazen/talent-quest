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
import { demoStore } from "@/lib/storage";
import { generateContestantId } from "@/lib/utils";
import type { DemoContestant, ProgressStep, TalentCategoryId } from "@/types";

const schema = z.object({
  fullName: z.string().min(2, "Please enter your full name"),
  stageName: z.string().optional(),
  email: z.string().email("Enter a valid email"),
  phone: z
    .string()
    .min(9, "Enter a valid phone number")
    .regex(/^[\d+\-\s()]+$/, "Numbers only"),
  age: z
    .coerce.number({ invalid_type_error: "Enter your age" })
    .int()
    .min(13, "Must be 13 or older")
    .max(99, "Enter a valid age"),
  city: z.string().min(2, "Where are you based?"),
  category: z.enum(
    ["singing", "dancing", "acting", "comedy", "instruments", "other"],
    { errorMap: () => ({ message: "Pick your category" }) }
  ),
  experience: z.string().min(1, "Tell us your level"),
  bio: z.string().min(20, "Add a short bio (at least 20 characters)").max(500),
  agreedToTerms: z
    .boolean()
    .refine((v) => v === true, { message: "You must agree to the demo terms" }),
});

type FormValues = z.infer<typeof schema>;

const TOTAL_STEPS = 3;

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = React.useState(1);
  const [submitted, setSubmitted] = React.useState<DemoContestant | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      fullName: "",
      stageName: "",
      email: "",
      phone: "",
      age: 18 as unknown as number,
      city: "",
      category: undefined,
      experience: "",
      bio: "",
      agreedToTerms: false,
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    trigger,
    setValue,
    watch,
  } = form;

  async function next() {
    let fields: (keyof FormValues)[] = [];
    if (step === 1) fields = ["fullName", "email", "phone", "age", "city"];
    if (step === 2) fields = ["category", "experience", "bio"];
    const ok = await trigger(fields);
    if (!ok) return;
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }

  function back() {
    setStep((s) => Math.max(s - 1, 1));
  }

  function onSubmit(values: FormValues) {
    const id = generateContestantId();
    const now = new Date().toISOString();
    const progress: ProgressStep[] = [
      { key: "registered", label: "Registered", done: true, date: now },
      { key: "video_submitted", label: "Video submitted", done: false },
      { key: "review", label: "Under review", done: false },
      { key: "shortlisted", label: "Shortlist decision", done: false },
      { key: "audition", label: "Live audition", done: false },
      { key: "result", label: "Final result", done: false },
    ];
    const c: DemoContestant = {
      id,
      fullName: values.fullName,
      stageName: values.stageName,
      email: values.email,
      phone: values.phone,
      age: Number(values.age),
      city: values.city,
      category: values.category,
      experience: values.experience,
      bio: values.bio,
      agreedToTerms: values.agreedToTerms,
      createdAt: now,
      status: "registered",
      progress,
    };
    demoStore.saveContestant(c);
    setSubmitted(c);
  }

  const watched = watch();
  const selectedCat = TALENT_CATEGORIES.find((c) => c.id === watched.category);

  if (submitted) {
    return <SuccessCard contestant={submitted} />;
  }

  return (
    <div className="container py-10 md:py-16 max-w-3xl">
      <div className="mb-8">
        <Badge variant="outline" className="mb-3">
          <Sparkles className="h-3 w-3 mr-1 text-brand-500" />
          Demo registration · stored locally on your device
        </Badge>
        <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
          Register your <span className="gradient-text">talent</span>.
        </h1>
        <p className="mt-3 text-muted-foreground">
          Three short steps. Your demo contestant ID is generated instantly.
          No backend, no payment — Phase 1 is fully free to try.
        </p>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between text-xs font-semibold mb-2">
          <span>Step {step} of {TOTAL_STEPS}</span>
          <span className="text-muted-foreground">
            {step === 1 && "About you"}
            {step === 2 && "Your talent"}
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
                  placeholder="you@example.com"
                  {...register("email")}
                />
              </Field>
              <Field label="Phone" error={errors.phone?.message}>
                <Input
                  type="tel"
                  placeholder="+251 9XX XX XX XX"
                  {...register("phone")}
                />
              </Field>
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              <Field label="Age" error={errors.age?.message}>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={13}
                  max={99}
                  {...register("age")}
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
            <Field label="Talent category" error={errors.category?.message}>
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
              hint="What makes your talent special? (20–500 chars)"
              error={errors.bio?.message}
            >
              <Textarea
                rows={5}
                placeholder="I'm a 22-year-old singer-songwriter from Addis Ababa..."
                {...register("bio")}
              />
              <div className="text-right text-[11px] text-muted-foreground mt-1">
                {watched.bio?.length || 0}/500
              </div>
            </Field>
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
                  ["Age", watched.age],
                  ["City", watched.city],
                  ["Category", selectedCat?.name],
                  ["Experience", watched.experience],
                ].map(([k, v]) => (
                  <div
                    key={String(k)}
                    className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-background px-3 py-2"
                  >
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="font-medium text-right">{String(v ?? "—")}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4 text-sm flex gap-3">
              <ShieldAlert className="h-5 w-5 shrink-0 text-amber-500 mt-0.5" />
              <div className="space-y-2">
                <p className="font-semibold">Phase 1 — demo notice</p>
                <ul className="space-y-1 text-muted-foreground list-disc pl-4">
                  <li>
                    No real authentication. No password. No backend storage.
                  </li>
                  <li>
                    Your data lives in your browser only. Clear it any time
                    from your profile.
                  </li>
                  <li>
                    Payment, video upload, and judge scoring are{" "}
                    <strong>future-production</strong> features.
                  </li>
                </ul>
              </div>
            </div>

            <Field error={errors.agreedToTerms?.message}>
              <Checkbox
                checked={watched.agreedToTerms}
                onChange={(e) =>
                  setValue("agreedToTerms", e.target.checked, {
                    shouldValidate: true,
                  })
                }
                label={
                  <span>
                    I understand this is a Phase 1 promotional demo and that no
                    competition entry, payment, or contract is being created.
                  </span>
                }
              />
            </Field>

            <div className="grid sm:grid-cols-3 gap-3 text-xs text-muted-foreground">
              <FuturePill icon={Lock} label="Real auth — Phase 2" />
              <FuturePill icon={CreditCard} label="Telebirr payment — Phase 2" />
              <FuturePill icon={Trophy} label="Judge scoring — Phase 2" />
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
            <Button type="submit" variant="gradient" size="lg">
              Generate my contestant ID
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

function SuccessCard({ contestant }: { contestant: DemoContestant }) {
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
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-fuchsia-500 text-white mx-auto">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h1 className="mt-5 font-display text-3xl md:text-4xl font-bold">
          You're on the stage list, {contestant.fullName.split(" ")[0]}.
        </h1>
        <p className="mt-2 text-muted-foreground">
          This is your demo contestant ID. Save it — you'll use it on the Result
          Checker.
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
          Demo IDs are random 6-digit numbers stored in your browser only.
        </p>

        <div className="grid sm:grid-cols-3 gap-3 mt-8 text-left">
          <Link
            href="/profile"
            className="rounded-xl border border-border/60 bg-background p-4 hover:border-brand-500/50 transition-colors"
          >
            <p className="text-sm font-semibold">View profile</p>
            <p className="text-xs text-muted-foreground">
              Track your demo progress.
            </p>
          </Link>
          <Link
            href="/upload-guide"
            className="rounded-xl border border-border/60 bg-background p-4 hover:border-brand-500/50 transition-colors"
          >
            <p className="text-sm font-semibold">Upload guide</p>
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
          <Button variant="gradient" onClick={() => router.push("/profile")}>
            Open my profile <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button variant="ghost" onClick={() => router.push("/")}>
            Back to home
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
