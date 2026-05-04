"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CTA() {
  return (
    <section className="container pb-16 md:pb-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-brand-500 via-fuchsia-500 to-cyan-500 p-10 md:p-16 text-white text-center stage-glow"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.2),transparent_50%)]" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur px-3 py-1 text-xs font-semibold mb-6">
            <Sparkles className="h-3 w-3" />
            Limited spots — round 1
          </div>
          <h2 className="font-display text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight">
            Your audition starts the moment you click.
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-white/85 text-lg">
            Six categories. Six cities. One national stage. Lock your spot in
            under 60 seconds.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="xl" className="bg-white text-brand-700 hover:bg-white/90">
              <Link href="/register">
                Register now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="xl"
              variant="outline"
              className="border-white/40 bg-white/10 hover:bg-white/20 text-white"
            >
              <Link href="/upload-guide">Read the upload guide</Link>
            </Button>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
