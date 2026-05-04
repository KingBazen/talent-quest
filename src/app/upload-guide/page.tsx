import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UPLOAD_TIPS } from "@/data/uploadGuide";
import { ArrowRight, CheckCircle2, XCircle, Sparkles } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Upload guide",
  description:
    "Background, lighting, camera, audio, mic distance, phone tips, duration, formats, and a 60-second test workflow.",
};

export default function UploadGuidePage() {
  return (
    <div className="container py-12 md:py-20">
      <div className="max-w-3xl">
        <Badge variant="outline" className="mb-3">
          Upload guide
        </Badge>
        <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight">
          Record like a pro on the gear you{" "}
          <span className="gradient-text">already own</span>.
        </h1>
        <p className="mt-4 text-muted-foreground text-lg">
          Most contestants film on a phone — and that's fine. Follow these nine
          checks and your submission will look (and sound) like a real audition
          tape.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Badge variant="gradient">
            <Sparkles className="h-3 w-3 mr-1" />
            Submit from your profile
          </Badge>
          <Badge variant="outline">
            MP4 / H.264 · up to 180 seconds
          </Badge>
        </div>
      </div>

      <div className="mt-12 grid lg:grid-cols-2 gap-5">
        {UPLOAD_TIPS.map((tip) => (
          <article
            key={tip.title}
            className="rounded-2xl border border-border/60 bg-card p-6"
          >
            <div className="flex items-start gap-4">
              <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500/20 to-fuchsia-500/20 text-brand-500">
                <tip.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-display text-xl font-bold">{tip.title}</h3>
                <p className="text-sm text-muted-foreground">{tip.summary}</p>
              </div>
            </div>

            <div className="mt-5 grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500 mb-2 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Do
                </p>
                <ul className="space-y-1.5 text-sm">
                  {tip.do.map((d) => (
                    <li key={d} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-rose-500 mb-2 flex items-center gap-1">
                  <XCircle className="h-3.5 w-3.5" /> Don't
                </p>
                <ul className="space-y-1.5 text-sm">
                  {tip.dont.map((d) => (
                    <li key={d} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-16 rounded-3xl border border-border/60 bg-card p-6 md:p-10">
        <h2 className="font-display text-2xl md:text-3xl font-bold">
          The 60-second pre-flight checklist
        </h2>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Run through this list right before you hit record.
        </p>
        <ol className="mt-6 grid sm:grid-cols-2 gap-3">
          {[
            "Phone in airplane mode + Do Not Disturb",
            "Lens wiped clean",
            "Battery above 50%, plugged in if possible",
            "Tripod or stable surface, level horizon",
            "Eyes in upper third of frame",
            "Front-facing light source, no harsh backlight",
            "Quiet room, fans/AC off",
            "Mic 15–30 cm from mouth",
            "Test recording: 10 seconds, watch on speaker AND headphones",
            "Pick the best take — don't submit the first one out of habit",
          ].map((s, i) => (
            <li
              key={s}
              className="flex items-start gap-3 rounded-xl border border-border/60 bg-background p-3"
            >
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-brand-500 to-fuchsia-500 text-[11px] font-bold text-white">
                {i + 1}
              </span>
              <span className="text-sm">{s}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-12 grid md:grid-cols-3 gap-4 text-sm">
        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <p className="font-semibold">Recommended specs</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li>• 1080p, 30 fps</li>
            <li>• MP4 (H.264) container</li>
            <li>• Stereo AAC audio, 44.1 kHz</li>
            <li>• Under 500 MB total</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <p className="font-semibold">Naming convention</p>
          <p className="mt-2 text-muted-foreground">
            <code className="rounded bg-muted px-1">FullName_Category_TakeNumber.mp4</code>
            <br />
            e.g. <code className="rounded bg-muted px-1">HannaTesfaye_Singing_T03.mp4</code>
          </p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <p className="font-semibold">Backups</p>
          <p className="mt-2 text-muted-foreground">
            Keep your original take. If our system flags your file, we may ask
            for a higher-quality version before the round closes.
          </p>
        </div>
      </div>

      <div className="mt-12 flex flex-col sm:flex-row gap-3">
        <Button asChild variant="gradient" size="lg">
          <Link href="/register">
            Register first <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/showcase">Watch reference performances</Link>
        </Button>
      </div>
    </div>
  );
}
