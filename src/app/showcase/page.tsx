"use client";

import * as React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Play, Filter, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TALENT_CATEGORIES } from "@/data/categories";
import type { ShowcaseClip, TalentCategoryId } from "@/types";
import { api } from "@/lib/client-api";
import { cn } from "@/lib/utils";

export default function ShowcasePage() {
  const [filter, setFilter] = React.useState<TalentCategoryId | "all">("all");
  const [clips, setClips] = React.useState<ShowcaseClip[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    api
      .get<{ items: ShowcaseClip[] }>("/api/showcase")
      .then((d) => setClips(d.items ?? []))
      .catch(() => setClips([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered =
    filter === "all" ? clips : clips.filter((c) => c.category === filter);

  return (
    <div className="container py-8 md:py-14">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <Badge variant="outline" className="mb-3">Showcase</Badge>
          <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight">
            Approved <span className="gradient-text">auditions</span>.
          </h1>
          <p className="text-muted-foreground mt-3 max-w-2xl">
            Performances cleared by our review panel. Filter by music category
            and watch what made the cut so far.
          </p>
        </div>
        <Badge variant="gradient" className="self-start md:self-end">
          <Sparkles className="h-3 w-3 mr-1" />
          {clips.length} {clips.length === 1 ? "clip" : "clips"}
        </Badge>
      </div>

      <div className="flex items-center gap-2 mb-6 overflow-x-auto scrollbar-hide pb-2">
        <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
        <FilterChip
          active={filter === "all"}
          onClick={() => setFilter("all")}
          label="All"
        />
        {TALENT_CATEGORIES.map((c) => (
          <FilterChip
            key={c.id}
            active={filter === c.id}
            onClick={() => setFilter(c.id)}
            label={`${c.emoji} ${c.name}`}
          />
        ))}
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground py-20">
          Loading auditions…
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState filtered={filter !== "all"} />
      ) : (
        <GridView clips={filtered} />
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "border-transparent bg-gradient-to-r from-brand-400 to-brand-600 text-white"
          : "border-border bg-background text-muted-foreground hover:bg-muted"
      )}
    >
      {label}
    </button>
  );
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-border/60 bg-card p-12 text-center"
    >
      <Play className="mx-auto h-10 w-10 text-muted-foreground" />
      <h2 className="mt-4 font-display text-2xl font-bold">
        {filtered
          ? "No approved auditions in this category yet."
          : "No approved auditions yet."}
      </h2>
      <p className="mt-2 text-muted-foreground max-w-md mx-auto">
        Auditions appear here once they pass review. Check back soon, or be one
        of the first — apply now and submit yours.
      </p>
    </motion.div>
  );
}

function GridView({ clips }: { clips: ShowcaseClip[] }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {clips.map((c) => (
        <a
          key={c.id}
          href={c.videoUrl ?? "#"}
          target={c.videoUrl ? "_blank" : undefined}
          rel={c.videoUrl ? "noreferrer" : undefined}
          className="group block rounded-2xl overflow-hidden border border-border/60 bg-card hover:border-brand-500/50 transition-all"
        >
          <div className="relative aspect-video bg-muted">
            <Image
              src={c.thumbnail}
              alt={c.title}
              fill
              sizes="(max-width: 768px) 100vw, 25vw"
              className="object-cover transition-transform group-hover:scale-105"
            />
            <Badge
              variant="gradient"
              className="absolute top-2 left-2 capitalize"
            >
              {c.category}
            </Badge>
            {c.durationSec ? (
              <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-mono text-white">
                {Math.floor(c.durationSec / 60)}:
                {String(c.durationSec % 60).padStart(2, "0")}
              </span>
            ) : null}
          </div>
          <div className="p-3">
            <h3 className="font-semibold line-clamp-2 leading-snug">{c.title}</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {c.contestant} · {c.city}
            </p>
          </div>
        </a>
      ))}
    </div>
  );
}
