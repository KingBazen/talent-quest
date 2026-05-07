import Link from "next/link";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { LegalDraftBanner } from "@/components/legal/LegalDraftBanner";

export const metadata: Metadata = {
  title: "Content rights",
  description:
    "Who owns what after you submit an audition video. Draft placeholder — must be reviewed by counsel before production launch.",
};

const SECTIONS = [
  {
    id: "you-own-your-work",
    title: "1. You keep ownership of your audition",
    body: [
      "When you upload an audition video to The Bling Records Show, you keep full ownership of the underlying performance, the song, the lyrics, and the recording. We do not buy your music. We do not claim a share of your masters or your publishing.",
      "What you grant us is a license to use the audition video for the specific purposes described below — nothing more.",
    ],
  },
  {
    id: "license-granted",
    title: "2. The license you grant on submission",
    body: [
      "By submitting an audition video you grant Bling Records and Neo Studios a non-exclusive, worldwide, royalty-free license to: (a) host and play the video on this site for evaluation by referees and admins; (b) include excerpts in production materials, episode promos, and broadcast for the season in which the video was submitted; (c) use the video in marketing for The Bling Records Show across our owned channels (this site, our social accounts, and partner press placements).",
      "The license is for the season in which you submitted, plus a 24-month tail for marketing and historical / archive use. After that window, the marketing use ceases; we keep the video for historical / archive purposes only.",
      "The license is non-transferable to third parties without your consent. We do not sub-license your audition to advertisers, brand partners, or other media companies.",
    ],
  },
  {
    id: "show-content",
    title: "3. What we own",
    body: [
      "Show content — anything filmed by Neo Studios on a Bling Records production set (rehearsals, performances, mentor sessions, reality-format moments, behind-the-scenes footage) — is owned by Bling Records and Neo Studios.",
      "If you sing or perform on a Bling Records production set, the underlying composition (your song, your lyrics) remains yours. The recording made by the production crew on a Bling Records set, however, is a production work owned by us. We may release these recordings as official show recordings or include them in episodes.",
      "Production photos taken on a Bling Records set are also owned by us. We use them for marketing and broadcast.",
    ],
  },
  {
    id: "originality",
    title: "4. Originality & third-party rights",
    body: [
      "You warrant that the audition video is your own original work, or that you have a license to use any third-party material in it (e.g. an instrumental beat from a producer who has signed a use-agreement with you, or a cover song where the licensing fee has been paid).",
      "Cover material and full master-track covers are evaluated case by case. If the rights chain on a cover is unclear, we may ask for documentation; if the documentation isn't provided, we will reject the submission rather than risk a takedown.",
      "If a takedown notice is filed against your audition by a third-party rights holder, we remove the video from public surfaces (showcase, marketing) and notify you via email. If the notice is mistaken, we restore the video once the dispute is resolved.",
    ],
  },
  {
    id: "publicity",
    title: "5. Publicity & likeness release",
    body: [
      "By participating in The Bling Records Show, you agree that Bling Records and Neo Studios may use your name, stage name, image, voice, biographical details (as supplied during registration), and performance footage in promotional materials, broadcast episodes, and press around the show.",
      "This release is for the duration of the season plus the 24-month marketing tail described in §2. We do not use your likeness in ways unrelated to The Bling Records Show without your written consent.",
      "If you withdraw, we stop using your likeness in new marketing materials immediately. Already-published materials (episodes that have aired, marketing posts that have shipped) are not retroactively edited; they remain as historical record.",
    ],
  },
  {
    id: "removal",
    title: "6. Removal of submitted content",
    body: [
      "If you want your audition removed from the public showcase before any decision has been made, withdraw via /contestant/profile and your audition is hidden from public surfaces immediately.",
      "If you want full removal of your audition file (not just hidden), send a request via the contact form. We process these within 14 days; the only exception is when the audition is under active referee review, in which case we wait until the review concludes.",
      "Removal does not retroactively delete the audition from broadcast episodes that have already aired or from already-published marketing assets.",
    ],
  },
  {
    id: "winner",
    title: "7. If you win",
    body: [
      "Winning the season triggers an artist-deal negotiation between you and Bling Records. The terms of that deal are negotiated and signed separately — they are not derived from this content-rights document.",
      "Anything you record under the artist deal is governed by the artist-deal contract, not by this page. This page only governs the audition video and the on-screen show content.",
    ],
  },
  {
    id: "disputes",
    title: "8. Disputes",
    body: [
      "Disputes about the scope of the license, the takedown handling, or the publicity release are handled through the contact form first. If we cannot resolve the dispute within 30 days, the dispute escalates per the governing-law clause of the terms.",
      "Nothing in this section limits your moral rights as an author under Ethiopian copyright law.",
    ],
  },
];

export default function ContentRightsPage() {
  return (
    <div className="container py-12 md:py-20 max-w-3xl">
      <Badge variant="outline" className="mb-3">Legal</Badge>
      <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight">
        Content{" "}
        <span className="gradient-text">rights</span>
      </h1>
      <p className="mt-4 text-muted-foreground text-lg">
        You keep your music. We get a focused license to run the show. Here is
        the scope, in plain language.
      </p>

      <div className="mt-8">
        <LegalDraftBanner
          lastReviewed="2026-05-06"
          documentName="content rights policy"
        />
      </div>

      <nav className="mt-10 rounded-2xl border border-border/60 bg-card p-5">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
          Sections
        </p>
        <ol className="grid gap-1.5 sm:grid-cols-2 text-sm">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <Link
                href={`#${s.id}`}
                className="text-muted-foreground hover:text-foreground"
              >
                {s.title}
              </Link>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-12 space-y-12">
        {SECTIONS.map((s) => (
          <section key={s.id} id={s.id} className="scroll-mt-24">
            <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight">
              {s.title}
            </h2>
            <div className="mt-4 space-y-4 text-muted-foreground">
              {s.body.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-14 rounded-2xl border border-border/60 bg-card p-6 text-sm text-muted-foreground">
        Related:{" "}
        <Link href="/terms" className="underline hover:text-foreground">
          terms &amp; competition rules
        </Link>
        {" · "}
        <Link href="/privacy" className="underline hover:text-foreground">
          privacy policy
        </Link>
        {" · "}
        <Link href="/refund-policy" className="underline hover:text-foreground">
          refund policy
        </Link>
        .
      </div>
    </div>
  );
}
