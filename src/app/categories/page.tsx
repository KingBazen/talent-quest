import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TALENT_CATEGORIES } from "@/data/categories";
import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Talent categories",
  description:
    "Singing, dancing, acting, comedy, instruments, and more — pick your stage.",
};

export default function CategoriesPage() {
  return (
    <div className="container py-12 md:py-20">
      <div className="max-w-3xl">
        <Badge variant="outline" className="mb-3">
          Categories
        </Badge>
        <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight">
          Pick your stage. Bring your <span className="gradient-text">heat</span>.
        </h1>
        <p className="mt-4 text-muted-foreground text-lg">
          Six categories, all weighted equally on the same 100-point rubric.
          You may compete in only one primary category per season — pick the
          one where your strongest performance lives.
        </p>
      </div>

      <div className="mt-12 space-y-12">
        {TALENT_CATEGORIES.map((c) => (
          <section
            key={c.id}
            id={c.id}
            className="grid lg:grid-cols-2 gap-6 rounded-3xl border border-border/60 bg-card p-6 md:p-10 scroll-mt-24"
          >
            <div>
              <div className="flex items-center gap-3">
                <span className="text-5xl">{c.emoji}</span>
                <div>
                  <h2 className="font-display text-3xl md:text-4xl font-bold">
                    {c.name}
                  </h2>
                  <p className="text-muted-foreground">{c.amharicName}</p>
                </div>
              </div>
              <p className="mt-4 text-base md:text-lg text-muted-foreground leading-relaxed">
                {c.description}
              </p>
              <Button asChild className="mt-6" variant="gradient">
                <Link href={`/register?cat=${c.id}`}>
                  Register in {c.name}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div>
              <p className="text-sm font-semibold mb-3">Examples we love</p>
              <div className="flex flex-wrap gap-2">
                {c.examples.map((ex) => (
                  <span
                    key={ex}
                    className={`rounded-full bg-gradient-to-r ${c.color} px-3 py-1 text-xs font-semibold text-white`}
                  >
                    {ex}
                  </span>
                ))}
              </div>
              <div className="mt-6 rounded-xl border border-border/60 bg-background p-4 text-sm">
                <p className="font-semibold">Tips for {c.name.toLowerCase()}</p>
                <ul className="mt-2 space-y-1 text-muted-foreground list-disc pl-5">
                  {tipsFor(c.id).map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function tipsFor(id: string): string[] {
  switch (id) {
    case "singing":
      return [
        "Choose a song that shows your range — but don't oversing.",
        "Live vocal preferred over heavy backing tracks.",
        "Hit your strongest moment in the first 30 seconds.",
      ];
    case "dancing":
      return [
        "Frame the full body — judges need to see footwork.",
        "Pair the music to your movement; don't fight the BPM.",
        "If a crew, line up the camera so everyone is visible.",
      ];
    case "acting":
      return [
        "Pick a piece with a clear emotional arc.",
        "Use the camera as your scene partner — eye line matters.",
        "Strong opening line, strong final beat.",
      ];
    case "comedy":
      return [
        "Test your bit on a friend before recording.",
        "Cut filler — every second should serve a laugh.",
        "Silence is okay; let beats land.",
      ];
    case "instruments":
      return [
        "Mic the instrument, not just the room.",
        "Show your hands — judges score technique.",
        "Solo or band, lock in your tempo from bar one.",
      ];
    default:
      return [
        "If it's visual (magic, acrobatics), shoot wide and avoid cuts.",
        "If it's a one-shot wonder, get one perfect take.",
        "Lead with the most dramatic moment of the act.",
      ];
  }
}
