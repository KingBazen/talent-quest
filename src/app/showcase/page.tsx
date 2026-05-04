"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Play,
  Heart,
  Volume2,
  VolumeX,
  Share2,
  Filter,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SHOWCASE_CLIPS } from "@/data/showcase";
import { TALENT_CATEGORIES } from "@/data/categories";
import type { ShowcaseClip, TalentCategoryId } from "@/types";
import { api } from "@/lib/client-api";
import { cn } from "@/lib/utils";

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function ShowcasePage() {
  const [filter, setFilter] = React.useState<TalentCategoryId | "all">("all");
  const [clips, setClips] = React.useState<ShowcaseClip[]>(SHOWCASE_CLIPS);

  React.useEffect(() => {
    api
      .get<{ items: ShowcaseClip[] }>("/api/showcase")
      .then((d) => {
        if (d.items?.length) setClips(d.items);
      })
      .catch(() => {});
  }, []);

  const filtered =
    filter === "all" ? clips : clips.filter((c) => c.category === filter);

  return (
    <div className="container py-8 md:py-14">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <Badge variant="outline" className="mb-3">Showcase</Badge>
          <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight">
            Performances on <span className="gradient-text">repeat</span>.
          </h1>
          <p className="text-muted-foreground mt-3 max-w-2xl">
            Two layouts: TikTok/Reels-style vertical scroll, or YouTube-style
            grid. Filter by category and find your favorite moments.
          </p>
        </div>
        <Badge variant="gradient" className="self-start md:self-end">
          <Sparkles className="h-3 w-3 mr-1" />
          {clips.length} clips
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

      <Tabs defaultValue="reels" className="w-full">
        <TabsList>
          <TabsTrigger value="reels">Reels view</TabsTrigger>
          <TabsTrigger value="grid">YouTube view</TabsTrigger>
        </TabsList>

        <TabsContent value="reels">
          <ReelsView clips={filtered} />
        </TabsContent>
        <TabsContent value="grid">
          <GridView clips={filtered} />
        </TabsContent>
      </Tabs>
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
          ? "border-transparent bg-gradient-to-r from-brand-500 to-fuchsia-500 text-white"
          : "border-border bg-background text-muted-foreground hover:bg-muted"
      )}
    >
      {label}
    </button>
  );
}

function ReelsView({ clips }: { clips: ShowcaseClip[] }) {
  return (
    <div className="reels-snap mx-auto h-[80vh] max-w-md overflow-y-auto rounded-3xl border border-border/60 bg-black">
      {clips.map((c) => (
        <ReelCard key={c.id} clip={c} />
      ))}
      {clips.length === 0 && (
        <div className="flex h-full items-center justify-center p-10 text-center text-white/60">
          No clips in this category.
        </div>
      )}
    </div>
  );
}

function ReelCard({ clip }: { clip: ShowcaseClip }) {
  const [muted, setMuted] = React.useState(true);
  const [liked, setLiked] = React.useState(false);
  return (
    <div className="relative h-[80vh] w-full overflow-hidden">
      <Image
        src={clip.thumbnail}
        alt={clip.title}
        fill
        sizes="(max-width: 768px) 100vw, 480px"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/30" />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-white/30 backdrop-blur text-white">
          <Play className="h-6 w-6 fill-current" />
        </span>
      </div>

      <div className="absolute right-3 bottom-24 flex flex-col gap-3 items-center">
        <button
          onClick={() => setLiked((v) => !v)}
          className="rounded-full bg-white/20 backdrop-blur p-3 text-white"
          aria-label="Like"
        >
          <Heart
            className={cn(
              "h-5 w-5",
              liked ? "fill-rose-500 text-rose-500" : "text-white"
            )}
          />
        </button>
        <span className="text-[11px] text-white/90 font-semibold">
          {fmt(clip.likes + (liked ? 1 : 0))}
        </span>
        <button
          onClick={() => setMuted((v) => !v)}
          className="rounded-full bg-white/20 backdrop-blur p-3 text-white"
          aria-label="Toggle audio"
        >
          {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>
        <button
          className="rounded-full bg-white/20 backdrop-blur p-3 text-white"
          aria-label="Share"
        >
          <Share2 className="h-5 w-5" />
        </button>
      </div>

      <div className="absolute left-4 right-20 bottom-6 text-white">
        <Badge variant="gradient" className="capitalize mb-2">
          {clip.category}
        </Badge>
        <h3 className="font-display text-xl font-bold leading-tight">
          {clip.title}
        </h3>
        <p className="mt-1 text-sm opacity-90">
          @{clip.contestant.replace(/\s+/g, "").toLowerCase()} · {clip.city}
        </p>
        <p className="mt-2 text-xs opacity-80">
          {fmt(clip.views)} views · scroll for next ↓
        </p>
      </div>
    </div>
  );
}

function GridView({ clips }: { clips: ShowcaseClip[] }) {
  const featured = clips[0];
  const rest = clips.slice(1);
  return (
    <div className="space-y-8">
      {featured && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid lg:grid-cols-3 gap-5 rounded-3xl border border-border/60 bg-card p-4"
        >
          <div className="lg:col-span-2 relative aspect-video rounded-2xl overflow-hidden bg-muted">
            <Image
              src={featured.thumbnail}
              alt={featured.title}
              fill
              sizes="(max-width: 1024px) 100vw, 66vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-black">
                <Play className="h-6 w-6 fill-current" />
              </span>
            </span>
            <Badge variant="gradient" className="absolute top-3 left-3 capitalize">
              {featured.category}
            </Badge>
          </div>
          <div className="lg:col-span-1 p-4">
            <h2 className="font-display text-2xl font-bold">{featured.title}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {featured.contestant} · {featured.city}
            </p>
            <div className="mt-3 flex gap-3 text-xs text-muted-foreground">
              <span>{fmt(featured.views)} views</span>
              <span>· {fmt(featured.likes)} likes</span>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              A featured highlight from this season's submissions. Phase 2 will
              auto-feature top-scoring clips per round.
            </p>
            <div className="mt-4 flex gap-2">
              <Button variant="gradient" size="sm">
                <Play className="h-4 w-4 mr-1.5 fill-current" /> Watch
              </Button>
              <Button variant="outline" size="sm">
                <Heart className="h-4 w-4 mr-1.5" /> Like
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {rest.map((c) => (
          <Link
            key={c.id}
            href="#"
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
              <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-mono text-white">
                {Math.floor(c.durationSec / 60)}:
                {String(c.durationSec % 60).padStart(2, "0")}
              </span>
            </div>
            <div className="p-3">
              <h3 className="font-semibold line-clamp-2 leading-snug">{c.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {c.contestant} · {c.city}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                {fmt(c.views)} views
              </p>
            </div>
          </Link>
        ))}
      </div>

      {clips.length === 0 && (
        <div className="text-center text-muted-foreground py-12">
          No clips in this category yet.
        </div>
      )}
    </div>
  );
}
