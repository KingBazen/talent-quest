import Link from "next/link";
import {
  ClipboardList,
  Video,
  Search,
  Users,
  Mic2,
  Home,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { JUDGING_CRITERIA, SCHEDULE } from "@/data/judging";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How auditions work",
  description:
    "From a 6-digit ID to the music house — the audition pipeline for The Bling Records Show, end to end.",
};

const FLOW = [
  {
    icon: ClipboardList,
    title: "1 · Apply",
    text: "Pick your music category, fill in your profile, accept the rules and content licensing terms. Your 6-digit contestant ID is generated and reserved instantly.",
  },
  {
    icon: Video,
    title: "2 · Submit your audition video",
    text: "60–180 seconds, MP4 (H.264). Upload directly from your phone (Cloudinary direct-upload lands in Phase 3) or paste a YouTube link.",
  },
  {
    icon: Search,
    title: "3 · First-pass review",
    text: "Our team checks audio quality, framing, and category fit. You'll get a green-light or feedback inside the audition window.",
  },
  {
    icon: Users,
    title: "4 · Industry-panel scoring",
    text: "Referees grade your audition on the 100-point rubric below. Once at least three referees weigh in, the aggregate appears on your profile and on the public result checker.",
  },
  {
    icon: Mic2,
    title: "5 · Shortlist",
    text: "Top scorers per category make the shortlist. The bar gets higher each round — same rubric, same weights.",
  },
  {
    icon: Home,
    title: "6 · The music house",
    text: "Twelve finalists move into the Bling Records music house. The on-screen reality show begins from there, produced with Neo Studios.",
  },
];

export default function AuditionsPage() {
  return (
    <div className="container py-12 md:py-20">
      <div className="max-w-3xl">
        <Badge variant="outline" className="mb-3">
          How auditions work
        </Badge>
        <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight">
          From your phone to the{" "}
          <span className="gradient-text">music house</span>.
        </h1>
        <p className="mt-4 text-muted-foreground text-lg">
          Six steps from a 6-digit ID to the twelve-finalist music house. Free
          to apply. Phone-shot auditions are welcome — we&apos;ve put real
          guidance in place so a great take from your bedroom can beat a
          polished take from a studio.
        </p>
      </div>

      <div className="mt-14 grid lg:grid-cols-2 gap-5">
        {FLOW.map((s) => (
          <div
            key={s.title}
            className="rounded-2xl border border-border/60 bg-card p-6 hover:border-brand-500/50 transition-colors"
          >
            <div className="flex items-start gap-4">
              <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500/20 to-brand-700/20 text-brand-500">
                <s.icon className="h-5 w-5" />
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-xl font-bold">{s.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {s.text}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-16">
        <h2 className="font-display text-2xl md:text-4xl font-bold">
          Judging rubric — <span className="gradient-text">100 points</span>
        </h2>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Every round is scored on the same five dimensions. Category and
          weight stay constant — only the bar gets higher each round.
        </p>
        <div className="mt-6 grid md:grid-cols-2 gap-4">
          {JUDGING_CRITERIA.map((c) => (
            <div
              key={c.key}
              className="rounded-2xl border border-border/60 bg-card p-5"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{c.label}</h3>
                <span className="rounded-full bg-gradient-to-r from-brand-400 to-brand-600 px-3 py-0.5 text-xs font-bold text-white">
                  {c.weight} pts
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {c.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-16">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5 text-brand-500" />
          <h2 className="font-display text-2xl md:text-4xl font-bold">
            Indicative schedule
          </h2>
        </div>
        <p className="text-muted-foreground max-w-2xl">
          Indicative dates for the first season. Final dates are confirmed at
          the start of each round.
        </p>
        <ol className="relative border-l border-border/60 ml-3 mt-6 space-y-6">
          {SCHEDULE.map((row) => (
            <li key={row.date} className="ml-6">
              <span className="absolute -left-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-gradient-to-r from-brand-400 to-brand-600 ring-4 ring-background" />
              <p className="text-sm text-muted-foreground">{row.date}</p>
              <p className="font-semibold">{row.label}</p>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-16 rounded-2xl bg-gradient-to-r from-brand-500 via-brand-500 to-brand-700 p-8 text-white text-center">
        <h3 className="font-display text-2xl md:text-3xl font-bold">
          Got it. Ready to apply?
        </h3>
        <p className="mt-2 text-white/80">
          A 6-digit ID and a profile in less than a minute.
        </p>
        <Button
          asChild
          size="lg"
          className="mt-4 bg-white text-brand-700 hover:bg-white/90"
        >
          <Link href="/register">Apply now</Link>
        </Button>
      </div>
    </div>
  );
}
