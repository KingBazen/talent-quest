import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Music2, Building2, Users } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About the show",
  description:
    "The Bling Records Show is a music-first reality competition built by Bling Records and Neo Studios — an audition pipeline that runs from a 6-digit contestant ID to the music house.",
};

export default function AboutPage() {
  return (
    <div className="container py-12 md:py-20">
      <div className="max-w-3xl">
        <Badge variant="outline" className="mb-3">About</Badge>
        <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight">
          A music-first stage,{" "}
          <span className="gradient-text">made for Ethiopia</span>.
        </h1>
        <p className="mt-4 text-muted-foreground text-lg">
          The Bling Records Show is a music-focused talent competition built by{" "}
          <strong className="text-foreground">Bling Records</strong> in
          partnership with{" "}
          <strong className="text-foreground">Neo Studios</strong>. We&apos;re
          looking for the next icon — rappers, singers, songwriters,
          performers, instrumentalists — and we&apos;re building the platform
          to find them.
        </p>
      </div>

      <div className="mt-12 grid lg:grid-cols-3 gap-5">
        <div className="rounded-2xl border border-border/60 bg-card p-6">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500/20 to-brand-700/20 text-brand-500">
            <Music2 className="h-5 w-5" />
          </div>
          <h2 className="mt-4 font-display text-xl font-bold">Bling Records</h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            The label behind the show — discovering and developing music
            artists, with the catalogue, network, and studio time to take a
            winning audition the rest of the way.
          </p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-6">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500/20 to-brand-700/20 text-brand-500">
            <Building2 className="h-5 w-5" />
          </div>
          <h2 className="mt-4 font-display text-xl font-bold">Neo Studios</h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            The production partner shaping the on-screen show — directing the
            stage segments, the music house, and the format that turns a
            6-digit ID into prime-time TV.
          </p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-6">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500/20 to-brand-700/20 text-brand-500">
            <Users className="h-5 w-5" />
          </div>
          <h2 className="mt-4 font-display text-xl font-bold">You</h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            The contestants. Phone-shot auditions are welcome — we&apos;ve put
            real upload guidance in place so a great take from your bedroom can
            beat a polished take from a studio.
          </p>
        </div>
      </div>

      <div className="mt-16 max-w-3xl">
        <h2 className="font-display text-2xl md:text-4xl font-bold">
          What the show looks like
        </h2>
        <p className="mt-3 text-muted-foreground">
          The audition platform you&apos;re on right now is the front door. The
          on-screen show — a multi-episode reality format with a live music
          house and twelve finalists — runs through Neo Studios.{" "}
          <Link href="/show-format" className="underline hover:text-foreground">
            See the format
          </Link>{" "}
          for what happens after the audition rounds.
        </p>
      </div>

      <div className="mt-12 flex flex-col sm:flex-row gap-3">
        <Button asChild variant="gradient" size="lg">
          <Link href="/register">
            Apply now <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/auditions">How auditions work</Link>
        </Button>
      </div>
    </div>
  );
}
