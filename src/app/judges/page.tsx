import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Gavel, Sparkles, Star, Users } from "lucide-react";
import { JUDGING_CRITERIA } from "@/data/judging";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Industry panel",
  description:
    "The referees who score The Bling Records Show auditions — credits, criteria, and how scoring works behind the scenes.",
};

export default function JudgesPage() {
  return (
    <div className="container py-12 md:py-20">
      <div className="max-w-3xl">
        <Badge variant="outline" className="mb-3">Industry panel</Badge>
        <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight">
          Scored by the{" "}
          <span className="gradient-text">industry</span>.
        </h1>
        <p className="mt-4 text-muted-foreground text-lg">
          Auditions are reviewed by an industry referee panel — producers,
          songwriters, vocal coaches, instrumentalists, and label A&amp;R.
          Every referee scores against the same 100-point rubric so a
          performance is judged the same whether the panel is in Addis or
          Bahir Dar.
        </p>
      </div>

      <div className="mt-12 rounded-3xl border border-border/60 bg-card p-8 md:p-10 text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-white mx-auto">
          <Users className="h-6 w-6" />
        </div>
        <h2 className="mt-5 font-display text-2xl md:text-3xl font-bold">
          The panel is being announced.
        </h2>
        <p className="mt-3 max-w-2xl mx-auto text-muted-foreground">
          We&apos;re finalising the referee roster with Bling Records and Neo
          Studios. Names, photos, and credits will be published here — and
          only here — once the lineup is locked in.
        </p>
        <p className="mt-2 max-w-2xl mx-auto text-xs text-muted-foreground">
          We don&apos;t put placeholder names on this page. Until the panel is
          announced, scoring runs through verified industry referees we&apos;ve
          partnered with directly.
        </p>
      </div>

      <div className="mt-16">
        <div className="flex items-center gap-2 mb-4">
          <Gavel className="h-5 w-5 text-brand-500" />
          <h2 className="font-display text-2xl md:text-4xl font-bold">
            How scoring works
          </h2>
        </div>
        <p className="text-muted-foreground max-w-2xl">
          Each audition is scored by at least three referees on five
          dimensions, summing to 100 points. The aggregate is what shows up on
          the public result checker — individual referee scores stay private.
        </p>
        <div className="mt-6 grid md:grid-cols-2 gap-4">
          {JUDGING_CRITERIA.map((c) => (
            <div
              key={c.key}
              className="rounded-2xl border border-border/60 bg-card p-5"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <Star className="h-4 w-4 text-gold-500" />
                  {c.label}
                </h3>
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

      <div className="mt-16 rounded-2xl bg-gradient-to-r from-brand-500 via-brand-500 to-brand-700 p-8 text-white text-center">
        <Sparkles className="h-6 w-6 mx-auto" />
        <h3 className="mt-2 font-display text-2xl md:text-3xl font-bold">
          Audition first. Names later.
        </h3>
        <p className="mt-2 max-w-xl mx-auto text-white/80">
          Whoever makes the panel, the rubric stays the same. Apply now, and
          your audition will be scored against the same five dimensions on day
          one as on the final round.
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
