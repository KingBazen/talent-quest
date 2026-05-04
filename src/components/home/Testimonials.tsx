"use client";

import { motion } from "framer-motion";
import { Quote, Star } from "lucide-react";

const items = [
  {
    name: "Hanna T.",
    role: "Singer · Addis Ababa",
    text: "I had no studio, no manager, no connections. TalentQuest gave me a stage. Two months later I was on TV.",
  },
  {
    name: "Yonas G.",
    role: "Krar player · Bahir Dar",
    text: "Traditional instruments rarely get this kind of platform. The judges actually understood what I was doing.",
  },
  {
    name: "Selam Crew",
    role: "Dance crew · Lalibela",
    text: "Six of us, one phone, one tripod. We followed the upload guide step by step and made it to the city qualifier.",
  },
];

export function Testimonials() {
  return (
    <section className="container py-16 md:py-24">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-500">
          Voices from the stage
        </p>
        <h2 className="mt-2 font-display text-3xl md:text-5xl font-bold tracking-tight">
          Real performers. <span className="gradient-text">Real momentum</span>.
        </h2>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {items.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            className="rounded-2xl border border-border/60 bg-card p-6"
          >
            <Quote className="h-6 w-6 text-brand-500" />
            <p className="mt-4 text-base leading-relaxed">"{t.text}"</p>
            <div className="mt-5 flex items-center justify-between">
              <div>
                <p className="font-semibold">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.role}</p>
              </div>
              <div className="flex">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star
                    key={j}
                    className="h-3.5 w-3.5 fill-gold-500 text-gold-500"
                  />
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
