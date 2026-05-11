"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Play, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/client-api";
import type { ShowcaseClip } from "@/types";

export function Showcase() {
  const [clips, setClips] = React.useState<ShowcaseClip[]>([]);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    api
      .get<{ items: ShowcaseClip[] }>("/api/showcase")
      .then((d) => setClips((d.items ?? []).slice(0, 6)))
      .catch(() => setClips([]))
      .finally(() => setLoaded(true));
  }, []);

  // Don't render the section at all until we know whether there are real clips.
  // Empty state is owned by /showcase, not the homepage — the homepage simply
  // hides the section if there's nothing approved yet.
  if (!loaded || clips.length === 0) return null;

  return (
    <section className="container py-10 md:py-16">
      <div className="flex flex-col md:flex-row items-end justify-between gap-4 mb-6">
        <div className="max-w-xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-500">
            Showcase
          </p>
          <h2 className="mt-2 font-display text-3xl md:text-5xl font-bold tracking-tight">
            Approved <span className="gradient-text">auditions</span>.
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
            <a
              href={v.videoUrl ?? "/showcase"}
              target={v.videoUrl ? "_blank" : undefined}
              rel={v.videoUrl ? "noreferrer" : undefined}
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
                <Badge
                  variant="gradient"
                  className="absolute top-3 left-3 capitalize"
                >
                  {v.category}
                </Badge>
                {v.durationSec ? (
                  <span className="absolute bottom-3 right-3 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-mono text-white">
                    {Math.floor(v.durationSec / 60)}:
                    {String(v.durationSec % 60).padStart(2, "0")}
                  </span>
                ) : null}
              </div>
              <div className="p-4">
                <h3 className="font-semibold line-clamp-1">{v.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {v.contestant} · {v.city}
                </p>
              </div>
            </a>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
