"use client";

import * as React from "react";
import {
  Star,
  Play,
  Send,
  Sparkles,
  Lock,
  Volume2,
  Maximize2,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { JUDGING_CRITERIA } from "@/data/judging";
import { SHOWCASE_CLIPS } from "@/data/showcase";
import { TALENT_CATEGORIES } from "@/data/categories";
import { cn } from "@/lib/utils";

export default function RefereeDemoPage() {
  const queue = SHOWCASE_CLIPS.slice(0, 5);
  const [active, setActive] = React.useState(0);
  const clip = queue[active];
  const cat = TALENT_CATEGORIES.find((c) => c.id === clip.category);
  const [scores, setScores] = React.useState<Record<string, number>>(() =>
    Object.fromEntries(JUDGING_CRITERIA.map((c) => [c.key, 0]))
  );
  const [notes, setNotes] = React.useState("");
  const [submitted, setSubmitted] = React.useState<string[]>([]);

  const total = JUDGING_CRITERIA.reduce((s, c) => s + (scores[c.key] || 0), 0);

  function setScore(key: string, val: number, max: number) {
    setScores((p) => ({ ...p, [key]: Math.max(0, Math.min(max, val)) }));
  }

  function submit() {
    setSubmitted((s) => [...s, clip.id]);
    if (active < queue.length - 1) {
      setActive(active + 1);
      setScores(Object.fromEntries(JUDGING_CRITERIA.map((c) => [c.key, 0])));
      setNotes("");
    }
  }

  return (
    <div className="container py-10 md:py-14 space-y-6">
      <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 text-sm flex items-start gap-3">
        <Lock className="h-5 w-5 mt-0.5 text-amber-500" />
        <div>
          <p className="font-semibold">Referee dashboard — preview only</p>
          <p className="text-muted-foreground">
            Phase 1 mocks the workflow with sample clips. Phase 2 streams real
            videos via signed URLs, and scores persist to PostgreSQL only after
            referee authentication.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Badge variant="outline" className="mb-2">Referee demo</Badge>
          <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
            Score every act on a <span className="gradient-text">100-point</span> rubric.
          </h1>
        </div>
        <Badge variant="gradient">
          <Sparkles className="h-3 w-3 mr-1" />
          {submitted.length} of {queue.length} reviewed
        </Badge>
      </div>

      <div className="grid lg:grid-cols-[1fr_380px] gap-6">
        <div className="rounded-3xl overflow-hidden border border-border/60 bg-card">
          <div
            className="relative aspect-video bg-cover bg-center"
            style={{ backgroundImage: `url(${clip.thumbnail})` }}
          >
            <div className="absolute inset-0 bg-black/40" />
            <div className="absolute inset-0 flex items-center justify-center">
              <button className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-white/90 text-black hover:scale-105 transition">
                <Play className="h-7 w-7 fill-current" />
              </button>
            </div>
            <div className="absolute top-3 left-3 flex gap-2">
              <Badge variant="gradient" className="capitalize">
                {cat?.emoji} {cat?.name}
              </Badge>
              <Badge variant="secondary" className="font-mono">
                ID 482{String(active).padStart(3, "0")}
              </Badge>
            </div>
            <div className="absolute bottom-3 right-3 flex gap-2">
              <button className="rounded-full bg-black/60 p-2 text-white">
                <Volume2 className="h-4 w-4" />
              </button>
              <button className="rounded-full bg-black/60 p-2 text-white">
                <Maximize2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="p-5 border-t border-border/60">
            <h2 className="font-display text-2xl font-bold">{clip.title}</h2>
            <p className="text-sm text-muted-foreground">
              {clip.contestant} · {clip.city} · {Math.floor(clip.durationSec / 60)}:
              {String(clip.durationSec % 60).padStart(2, "0")}
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-border/60 bg-card p-5 space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <p className="font-semibold">Your score</p>
              <span className="font-display text-2xl font-bold gradient-text">
                {total} / 100
              </span>
            </div>
            <Progress value={total} className="mt-2" />
          </div>

          <div className="space-y-3">
            {JUDGING_CRITERIA.map((c) => (
              <div key={c.key}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{c.label}</span>
                  <span className="text-muted-foreground">
                    {scores[c.key] || 0} / {c.weight}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {c.description}
                </p>
                <input
                  type="range"
                  min={0}
                  max={c.weight}
                  value={scores[c.key] || 0}
                  onChange={(e) => setScore(c.key, Number(e.target.value), c.weight)}
                  className="mt-2 w-full accent-brand-500"
                />
                <div className="mt-2 flex gap-1.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setScore(c.key, ((i + 1) / 5) * c.weight, c.weight)}
                      className={cn(
                        "rounded-md p-1 transition",
                        (scores[c.key] || 0) >= ((i + 1) / 5) * c.weight
                          ? "text-gold-500"
                          : "text-muted-foreground"
                      )}
                      aria-label={`${i + 1} stars`}
                    >
                      <Star
                        className={cn(
                          "h-4 w-4",
                          (scores[c.key] || 0) >= ((i + 1) / 5) * c.weight && "fill-gold-500"
                        )}
                      />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div>
            <p className="text-sm font-medium mb-1.5">Private notes</p>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Strong stage presence; tighten the pre-chorus."
            />
          </div>

          <Button onClick={submit} variant="gradient" size="lg" className="w-full">
            Submit score
            <Send className="ml-2 h-4 w-4" />
          </Button>
          <p className="text-[11px] text-muted-foreground text-center">
            Demo — scores are not stored.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-4">
        <p className="font-semibold text-sm mb-3">Review queue ({queue.length})</p>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
          {queue.map((q, i) => (
            <button
              key={q.id}
              onClick={() => setActive(i)}
              className={cn(
                "shrink-0 w-44 rounded-xl border p-2 text-left transition",
                active === i ? "border-brand-500" : "border-border/60 hover:bg-muted"
              )}
            >
              <div
                className="aspect-video rounded-md bg-cover bg-center"
                style={{ backgroundImage: `url(${q.thumbnail})` }}
              />
              <p className="mt-2 text-xs font-medium line-clamp-1">{q.title}</p>
              <p className="text-[10px] text-muted-foreground">{q.contestant}</p>
              {submitted.includes(q.id) && (
                <Badge variant="gradient" className="mt-1.5 text-[10px]">
                  Reviewed
                </Badge>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
