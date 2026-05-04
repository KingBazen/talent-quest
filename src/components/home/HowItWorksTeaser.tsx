"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  ClipboardList,
  Video,
  Star,
  Trophy,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = [
  {
    icon: ClipboardList,
    n: "01",
    title: "Register",
    text: "Pick your category, fill in 6 fields, get your contestant ID instantly.",
  },
  {
    icon: Video,
    n: "02",
    title: "Submit your video",
    text: "Upload a 60–180 second performance. Our upload guide walks you through it.",
  },
  {
    icon: Star,
    n: "03",
    title: "Get scored",
    text: "Industry judges grade you on a 100-point rubric across 5 dimensions.",
  },
  {
    icon: Trophy,
    n: "04",
    title: "Rise to the final",
    text: "City qualifiers → semi-final → live national grand final.",
  },
];

export function HowItWorksTeaser() {
  return (
    <section className="container py-16 md:py-24">
      <div className="flex flex-col md:flex-row items-end justify-between gap-4 mb-10">
        <div className="max-w-xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-500">
            How it works
          </p>
          <h2 className="mt-2 font-display text-3xl md:text-5xl font-bold tracking-tight">
            From bedroom to grand final in <span className="gradient-text">four steps</span>.
          </h2>
        </div>
        <Button asChild variant="ghost">
          <Link href="/how-it-works">
            See full timeline <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {steps.map((s, i) => (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className="relative rounded-2xl border border-border/60 bg-card p-6 hover:border-brand-500/50 transition-colors"
          >
            <span className="absolute -top-3 right-4 rounded-full bg-gradient-to-r from-brand-500 to-fuchsia-500 px-3 py-1 text-xs font-bold text-white">
              {s.n}
            </span>
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500/20 to-fuchsia-500/20 text-brand-500 mb-4">
              <s.icon className="h-5 w-5" />
            </div>
            <h3 className="font-display text-xl font-bold">{s.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
