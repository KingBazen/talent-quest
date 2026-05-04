"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Play, ArrowRight, Heart } from "lucide-react";
import { SHOWCASE_CLIPS } from "@/data/showcase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function fmtViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function Showcase() {
  const clips = SHOWCASE_CLIPS.slice(0, 6);
  return (
    <section className="container py-16 md:py-24">
      <div className="flex flex-col md:flex-row items-end justify-between gap-4 mb-10">
        <div className="max-w-xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-500">
            Showcase
          </p>
          <h2 className="mt-2 font-display text-3xl md:text-5xl font-bold tracking-tight">
            Performances that gave us <span className="gradient-text">chills</span>.
          </h2>
        </div>
        <Button asChild variant="ghost">
          <Link href="/showcase">
            Open showcase <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {clips.map((v, i) => (
          <motion.div
            key={v.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
          >
            <Link
              href={`/showcase?id=${v.id}`}
              className="group block rounded-2xl overflow-hidden border border-border/60 bg-card hover:border-brand-500/50 transition-all"
            >
              <div className="relative aspect-video overflow-hidden bg-muted">
                <Image
                  src={v.thumbnail}
                  alt={v.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-black/0" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-black">
                    <Play className="h-5 w-5 fill-current" />
                  </span>
                </div>
                <Badge variant="gradient" className="absolute top-3 left-3 capitalize">
                  {v.category}
                </Badge>
                <span className="absolute bottom-3 right-3 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-mono text-white">
                  {Math.floor(v.durationSec / 60)}:
                  {String(v.durationSec % 60).padStart(2, "0")}
                </span>
              </div>
              <div className="p-4">
                <h3 className="font-semibold line-clamp-1">{v.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {v.contestant} · {v.city}
                </p>
                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{fmtViews(v.views)} views</span>
                  <span className="flex items-center gap-1">
                    <Heart className="h-3 w-3" />
                    {fmtViews(v.likes)}
                  </span>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
