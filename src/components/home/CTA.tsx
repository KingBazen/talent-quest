"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/components/i18n/LangProvider";
import { useSession } from "@/components/auth/SessionProvider";
import { BlingLogo } from "@/components/brand/BlingLogo";

export function CTA() {
  const { lang } = useLang();
  const { user, contestant, latestPayment, loading } = useSession();

  // Login-aware primary CTA — same sequencing as the Hero.
  const primary = (() => {
    if (loading || !user) {
      return {
        href: "/register",
        label: lang === "am" ? "አሁን ይመዝገቡ" : "Register now",
      };
    }
    if (user.role === "contestant" && contestant) {
      if (latestPayment?.status === "succeeded") {
        return {
          href: "/contestant/dashboard",
          label: lang === "am" ? "ቪዲዮዎን ይላኩ" : "Upload your audition",
        };
      }
      return {
        href: "/contestant/payment",
        label: lang === "am" ? "ክፍያ ይክፈሉ" : "Pay 500 ETB now",
      };
    }
    return {
      href: "/contestant/dashboard",
      label: lang === "am" ? "ዳሽቦርድ" : "Open dashboard",
    };
  })();

  const headline =
    lang === "am"
      ? "ኦዲሽንዎ የሚጀምረው አንድ ጠቅ ነው።"
      : "Your audition starts the moment you click.";
  const sub =
    lang === "am"
      ? "ይመዝገቡ። 500 ብር ይክፈሉ። ቪዲዮዎን ይላኩ። ምርጥ 12 ተወዳዳሪዎች የሙዚቃ ቤት ይገባሉ።"
      : "Register. Pay 500 ETB. Upload your audition. The top twelve make it into the music house.";

  return (
    <section className="container pb-16 md:pb-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-brand-500 via-brand-500 to-brand-700 p-10 md:p-16 text-white text-center stage-glow"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.2),transparent_50%)]" />
        <div className="relative">
          <div className="inline-flex items-center gap-3 rounded-full bg-white/15 backdrop-blur px-4 py-1.5 text-xs font-semibold mb-6">
            <BlingLogo variant="icon" size={22} showRing={false} animated={false} />
            <span className="opacity-80">×</span>
            <Image
              src="/brand/neo-studios-logo.png"
              alt="Neo Studios"
              width={64}
              height={22}
              className="h-[22px] w-auto object-contain brightness-0 invert"
            />
          </div>
          <h2 className="font-display text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight">
            {headline}
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-white/85 text-lg">{sub}</p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              asChild
              size="xl"
              className="bg-white text-brand-700 hover:bg-white/90"
            >
              <Link href={primary.href}>
                {primary.label}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="xl"
              variant="outline"
              className="border-white/40 bg-white/10 hover:bg-white/20 text-white"
            >
              <Link href="/upload-guide">
                {lang === "am"
                  ? "የኦዲሽን መመሪያ ያንብቡ"
                  : "Read the audition guide"}
              </Link>
            </Button>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
