"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { TALENT_CATEGORIES } from "@/data/categories";
import { Button } from "@/components/ui/button";

export function CategoryGrid() {
  return (
    <section className="container py-16 md:py-24">
      <div className="flex flex-col md:flex-row items-end justify-between gap-4 mb-10">
        <div className="max-w-xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-500">
            Talent categories
          </p>
          <h2 className="mt-2 font-display text-3xl md:text-5xl font-bold tracking-tight">
            Pick your stage. Bring your <span className="gradient-text">heat</span>.
          </h2>
        </div>
        <Button asChild variant="ghost">
          <Link href="/categories">
            All categories <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TALENT_CATEGORIES.map((c, i) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
          >
            <Link
              href={`/categories#${c.id}`}
              className="group block rounded-2xl border border-border/60 bg-card p-6 hover:border-transparent hover:shadow-2xl transition-all relative overflow-hidden"
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${c.color} opacity-0 group-hover:opacity-10 transition-opacity`}
              />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-4xl">{c.emoji}</span>
                  <span
                    className={`rounded-full bg-gradient-to-r ${c.color} px-3 py-1 text-xs font-semibold text-white`}
                  >
                    {c.amharicName}
                  </span>
                </div>
                <h3 className="font-display text-2xl font-bold">{c.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                  {c.description}
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {c.examples.slice(0, 3).map((ex) => (
                    <span
                      key={ex}
                      className="inline-flex rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground"
                    >
                      {ex}
                    </span>
                  ))}
                </div>
                <div className="mt-5 flex items-center gap-1 text-sm font-semibold text-brand-500">
                  Compete in {c.name}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
