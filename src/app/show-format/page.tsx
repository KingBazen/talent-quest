import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Home, Mic2, Tv, Trophy, Sparkles } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Show format",
  description:
    "How The Bling Records Show is structured: auditions → twelve-finalist music house → on-screen reality format produced with Neo Studios.",
};

const PILLARS = [
  {
    icon: Mic2,
    title: "Open auditions",
    body: "Register on this site, pay the 500 ETB audition fee, submit your audition video, and pass the industry-panel scoring rubric. Shortlisting is based on score, not network.",
  },
  {
    icon: Home,
    title: "Twelve finalists, one music house",
    body: "Top scorers move into the Bling Records music house. Twelve artists, one season — the cast that the on-screen show is built around.",
  },
  {
    icon: Tv,
    title: "On-screen reality format",
    body: "Produced with Neo Studios as a multi-episode reality show. Performance stages, mentor segments, and weekly challenges — built around the music, not manufactured drama.",
  },
  {
    icon: Trophy,
    title: "A real prize",
    body: "The winner walks out with a Bling Records artist deal — studio time, distribution, and the catalogue support to keep the momentum after the cameras leave.",
  },
];

export default function ShowFormatPage() {
  return (
    <div className="container py-12 md:py-20">
      <div className="max-w-3xl">
        <Badge variant="outline" className="mb-3">Show format</Badge>
        <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight">
          From audition to{" "}
          <span className="gradient-text">music house</span>.
        </h1>
        <p className="mt-4 text-muted-foreground text-lg">
          The Bling Records Show is built around four pillars. Final episode
          counts, weekly challenges, and air dates are confirmed by Bling
          Records and Neo Studios closer to season opening.
        </p>
      </div>

      <div className="mt-12 grid lg:grid-cols-2 gap-5">
        {PILLARS.map((p) => (
          <div
            key={p.title}
            className="rounded-2xl border border-border/60 bg-card p-6"
          >
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500/20 to-brand-700/20 text-brand-500">
              <p.icon className="h-5 w-5" />
            </div>
            <h2 className="mt-4 font-display text-xl font-bold">{p.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              {p.body}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-16 rounded-3xl border border-border/60 bg-card p-6 md:p-10">
        <Sparkles className="h-6 w-6 text-brand-500" />
        <h2 className="mt-3 font-display text-2xl md:text-3xl font-bold">
          Coming next
        </h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Episode count, on-screen mentors, performance challenges, and the
          public broadcast schedule are all part of the production layer
          we&apos;re building with Neo Studios. We&apos;ll publish them here
          as they&apos;re finalised — and we&apos;ll never put a date on this
          page that the show can&apos;t deliver.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <Button asChild variant="gradient">
            <Link href="/register">Apply now</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/auditions">How auditions work</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
