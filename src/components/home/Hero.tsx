"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Play, Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-spotlight pointer-events-none" />
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 h-72 w-72 rounded-full bg-brand-500/30 blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-1/4 right-1/4 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-fuchsia-500/20 blur-3xl" />
      </div>

      <div className="container py-16 md:py-24 lg:py-32 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center text-center max-w-4xl mx-auto"
        >
          <Badge variant="outline" className="mb-6 backdrop-blur-sm bg-background/50">
            <Sparkles className="mr-1 h-3 w-3 text-brand-500" />
            Live · Season 1 registration open
          </Badge>

          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-balance">
            Ethiopia's stage for the
            <br />
            <span className="gradient-text">next big talent.</span>
          </h1>

          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl text-balance">
            Sing, dance, act, joke, play, or wow us with something we've never
            seen. Register in 60 seconds, submit your video, and rise through
            city qualifiers all the way to the live grand final.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Button asChild size="xl" variant="gradient" className="group">
              <Link href="/register">
                Register now
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button asChild size="xl" variant="outline">
              <Link href="/showcase">
                <Play className="mr-2 h-4 w-4" />
                Watch the showcase
              </Link>
            </Button>
          </div>

          <div className="mt-10 flex items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="flex -space-x-2">
                {["A", "B", "C", "D"].map((c, i) => (
                  <div
                    key={c}
                    className="h-7 w-7 rounded-full border-2 border-background bg-gradient-to-br from-brand-500 to-fuchsia-500 flex items-center justify-center text-white text-xs font-semibold"
                  >
                    {c}
                  </div>
                ))}
              </div>
              <span className="ml-2 font-semibold text-foreground">2,400+</span>
              <span>contestants registered</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5">
              <Star className="h-4 w-4 fill-gold-500 text-gold-500" />
              <Star className="h-4 w-4 fill-gold-500 text-gold-500" />
              <Star className="h-4 w-4 fill-gold-500 text-gold-500" />
              <Star className="h-4 w-4 fill-gold-500 text-gold-500" />
              <Star className="h-4 w-4 fill-gold-500 text-gold-500" />
              <span className="ml-1 font-semibold text-foreground">4.9</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6"
        >
          {[
            { num: "6", label: "Talent categories" },
            { num: "6", label: "Host cities" },
            { num: "100K", label: "Grand prize (ETB)" },
            { num: "1", label: "National stage" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm p-4 md:p-6 text-center"
            >
              <p className="font-display text-3xl md:text-4xl font-bold gradient-text">
                {s.num}
              </p>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">
                {s.label}
              </p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
