"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Mic2, Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLang } from "@/components/i18n/LangProvider";
import { useSession } from "@/components/auth/SessionProvider";
import { BlingLogo } from "@/components/brand/BlingLogo";

interface PrimaryCta {
  href: string;
  label: string;
}

export function Hero() {
  const { t, lang } = useLang();
  const { user, contestant, latestPayment, loading } = useSession();

  const isContestant = user?.role === "contestant" && Boolean(contestant);
  const stepDone: [boolean, boolean, boolean] = [
    Boolean(user),
    Boolean(isContestant && latestPayment?.status === "succeeded"),
    false,
  ];
  const currentStep = stepDone.findIndex((d) => !d);

  // Login-aware primary CTA. Sequence matches the homepage 1/2/3 flow:
  // not signed in → register; signed in but unpaid → pay; signed in & paid → upload.
  const primary: PrimaryCta = (() => {
    if (loading || !user) {
      return { href: "/register", label: t.hero.cta_apply };
    }
    if (user.role !== "contestant" || !contestant) {
      return {
        href: "/contestant/dashboard",
        label: lang === "am" ? "ዳሽቦርድ" : "Open dashboard",
      };
    }
    if (latestPayment?.status === "succeeded") {
      return {
        href: "/contestant/dashboard",
        label: lang === "am" ? "ቪዲዮዎን ይላኩ" : "Upload your audition",
      };
    }
    return {
      href: "/contestant/payment",
      label: lang === "am" ? "ክፍያ ይክፈሉ" : "Pay audition fee",
    };
  })();

  const stepLabels: [string, string, string] =
    lang === "am"
      ? ["ይመዝገቡ", "500 ብር ይክፈሉ", "ቪዲዮዎን ይላኩ"]
      : ["Register", "Pay 500 ETB", "Upload audition"];
  const stepHrefs: [string, string, string] = [
    user ? "/contestant/dashboard" : "/register",
    isContestant ? "/contestant/payment" : "/register",
    isContestant && latestPayment?.status === "succeeded"
      ? "/contestant/dashboard"
      : "/upload-guide",
  ];

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-spotlight pointer-events-none" />
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 h-72 w-72 rounded-full bg-brand-500/30 blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-1/4 right-1/4 h-72 w-72 rounded-full bg-brand-700/25 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-brand-400/20 blur-3xl" />
      </div>

      <div className="container py-8 md:py-14 lg:py-20 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center text-center max-w-4xl mx-auto"
        >
          <BlingLogo
            variant="stacked"
            size={72}
            className="mb-3 md:hidden"
          />
          <BlingLogo
            variant="stacked"
            size={96}
            className="mb-4 hidden md:inline-flex"
          />

          <Badge
            variant="outline"
            className="mb-4 backdrop-blur-sm bg-background/50"
          >
            <Sparkles className="mr-1 h-3 w-3 text-brand-500" />
            {t.hero.eyebrow}
          </Badge>

          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-balance">
            {t.hero.headline_1}
            <br />
            <span className="gradient-text">{t.hero.headline_2}</span>
          </h1>

          <p className="mt-4 text-base md:text-lg text-muted-foreground max-w-2xl text-balance">
            {t.hero.sub}
          </p>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Button asChild size="xl" variant="gradient" className="group">
              <Link href={primary.href}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {primary.label}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button asChild size="xl" variant="outline">
              <Link href="/auditions">
                <Mic2 className="mr-2 h-4 w-4" />
                {t.hero.cta_how}
              </Link>
            </Button>
          </div>

          <div className="mt-6 w-full max-w-2xl">
            <ol className="flex items-stretch justify-between gap-2 rounded-2xl border border-border/60 bg-background/60 backdrop-blur p-2">
              {stepLabels.map((label, i) => {
                const done = stepDone[i];
                const isCurrent = i === currentStep;
                return (
                  <li key={label} className="flex-1">
                    <Link
                      href={stepHrefs[i]}
                      className={`flex items-center gap-2 rounded-xl px-3 py-2 text-left transition-colors ${
                        done
                          ? "bg-emerald-500/10 text-emerald-600"
                          : isCurrent
                          ? "bg-brand-500/15 ring-1 ring-brand-500/40 text-foreground"
                          : "text-muted-foreground hover:bg-muted/50"
                      }`}
                    >
                      <span
                        className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                          done
                            ? "bg-emerald-500 text-white"
                            : isCurrent
                            ? "bg-gradient-to-br from-brand-400 to-brand-600 text-white"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                      </span>
                      <span className="text-xs sm:text-sm font-semibold leading-tight">
                        {label}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {lang === "am"
              ? "የኢትዮጵያ 12 ታማኝ ባንኮች ተቀባይነት አላቸው · EN / አማርኛ"
              : "Pay by AdmasPay or by uploading a bank receipt · EN / አማርኛ"}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
