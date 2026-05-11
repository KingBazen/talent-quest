"use client";

import * as React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight,
  CreditCard,
  Loader2,
  UserPlus,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLang } from "@/components/i18n/LangProvider";
import { useSession } from "@/components/auth/SessionProvider";

/**
 * Homepage "how it works" teaser. Three actionable steps for low-tech-experience
 * users: Register → Pay → Upload. Each step shows a live checkmark for the
 * signed-in contestant so they always know what to do next.
 */

interface StepCopy {
  n: string;
  title: string;
  body: string;
  cta: string;
}

interface SectionCopy {
  eyebrow: string;
  headline_1: string;
  headline_2: string;
  steps: [StepCopy, StepCopy, StepCopy];
  prize_note: string;
}

const COPY_EN: SectionCopy = {
  eyebrow: "How it works",
  headline_1: "Three steps from your phone",
  headline_2: "to the music house.",
  steps: [
    {
      n: "1",
      title: "Register",
      body: "Free account. Pick your music category, fill in your profile, and get a 6-digit contestant ID instantly.",
      cta: "Register now",
    },
    {
      n: "2",
      title: "Pay 500 ETB",
      body: "AdmasPay (Telebirr / M-Pesa / CBE Birr) or upload a bank-transfer receipt screenshot from any of 12 trusted Ethiopian banks.",
      cta: "Pay audition fee",
    },
    {
      n: "3",
      title: "Upload your audition",
      body: "60–180 seconds, phone-shot is fine. Industry referees score every entry on a 100-point rubric — top 12 join the music house.",
      cta: "Upload your audition",
    },
  ],
  prize_note:
    "Registration is free, but uploading your audition needs the 500 ETB fee. No fee, no upload.",
};

const COPY_AM: SectionCopy = {
  eyebrow: "እንዴት እንደሚሰራ",
  headline_1: "ከስልክዎ እስከ የሙዚቃ ቤት",
  headline_2: "በሦስት ቀላል ደረጃዎች።",
  steps: [
    {
      n: "1",
      title: "ይመዝገቡ",
      body: "ነፃ መለያ። የሙዚቃ ምድብዎን ይምረጡ፣ መገለጫዎን ይሙሉ፣ ወዲያውኑ የ6-አሃዝ የተወዳዳሪ መታወቂያ ያግኙ።",
      cta: "አሁን ይመዝገቡ",
    },
    {
      n: "2",
      title: "500 ብር ይክፈሉ",
      body: "በAdmasPay (ቴሌብር / ኤም-ፔሳ / ሲቢኢ ብር) ወይም ከ12 የኢትዮጵያ ታማኝ ባንኮች የባንክ ዝውውር ደረሰኝ ይጫኑ።",
      cta: "ክፍያ ይክፈሉ",
    },
    {
      n: "3",
      title: "ቪዲዮዎን ይላኩ",
      body: "60–180 ሰከንድ፣ በስልክ የተቀረጸ ይሰራል። የኢንዱስትሪው ዳኞች ሁሉንም በ100 ነጥብ ይመዝናሉ — ምርጥ 12ቱ ወደ ሙዚቃ ቤት ይገባሉ።",
      cta: "ቪዲዮዎን ይላኩ",
    },
  ],
  prize_note:
    "መመዝገብ ነፃ ነው፣ ነገር ግን ቪዲዮዎን ለመላክ የ500 ብር ክፍያ ያስፈልጋል። ክፍያ ከሌለ መላክ የለም።",
};

export function HowItWorksTeaser() {
  const { lang } = useLang();
  const { user, contestant, latestPayment, loading } = useSession();
  const copy = lang === "am" ? COPY_AM : COPY_EN;

  // Per-step done-state for a logged-in contestant.
  const isContestant = user?.role === "contestant" && Boolean(contestant);
  const stepDone = [
    Boolean(user), // 1. Register
    isContestant && latestPayment?.status === "succeeded", // 2. Pay
    false, // 3. Upload — we don't know without a separate fetch; left undone
  ];

  // Per-step CTA destination.
  const stepHref = [
    user ? "/contestant/dashboard" : "/register",
    isContestant ? "/contestant/payment" : "/register",
    isContestant && latestPayment?.status === "succeeded"
      ? "/contestant/dashboard"
      : "/upload-guide",
  ];

  // The single "current" step for the user — the first not-done step.
  const currentIdx = loading
    ? -1
    : stepDone.findIndex((d) => !d) === -1
    ? 2
    : stepDone.findIndex((d) => !d);

  const stepIcons = [UserPlus, CreditCard, Video];

  return (
    <section className="container py-10 md:py-16">
      <div className="flex flex-col md:flex-row items-end justify-between gap-4 mb-6">
        <div className="max-w-xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-500">
            {copy.eyebrow}
          </p>
          <h2 className="mt-2 font-display text-3xl md:text-5xl font-bold tracking-tight">
            {copy.headline_1}{" "}
            <span className="gradient-text">{copy.headline_2}</span>
          </h2>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {copy.steps.map((s, i) => {
          const Icon = stepIcons[i];
          const done = stepDone[i];
          const current = i === currentIdx;
          return (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`relative rounded-2xl border p-6 transition-colors ${
                done
                  ? "border-emerald-500/40 bg-emerald-500/5"
                  : current
                  ? "border-brand-500 bg-brand-500/5 ring-2 ring-brand-500/20"
                  : "border-border/60 bg-card hover:border-brand-500/50"
              }`}
            >
              <span
                className={`absolute -top-3 right-4 rounded-full px-3 py-1 text-xs font-bold text-white ${
                  done
                    ? "bg-emerald-500"
                    : "bg-gradient-to-r from-brand-400 to-brand-600"
                }`}
              >
                {done ? "✓" : s.n}
              </span>
              <div
                className={`inline-flex h-12 w-12 items-center justify-center rounded-xl mb-4 ${
                  done
                    ? "bg-emerald-500/15 text-emerald-500"
                    : "bg-gradient-to-br from-brand-500/20 to-brand-700/20 text-brand-500"
                }`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-display text-xl font-bold">{s.title}</h3>
                {current && !loading && (
                  <Badge variant="gradient" className="text-[10px]">
                    {lang === "am" ? "ቀጣይዎ" : "Your next step"}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{s.body}</p>

              {(current || done) && !loading && (
                <Button
                  asChild
                  size="sm"
                  variant={done ? "outline" : "gradient"}
                  className="mt-4"
                >
                  <Link href={stepHref[i]}>
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {done
                      ? lang === "am"
                        ? "ተጠናቋል"
                        : "Done"
                      : s.cta}
                    {!done && <ArrowRight className="ml-2 h-3.5 w-3.5" />}
                  </Link>
                </Button>
              )}
            </motion.div>
          );
        })}
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {copy.prize_note}
      </p>
    </section>
  );
}
