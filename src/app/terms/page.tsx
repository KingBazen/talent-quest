import Link from "next/link";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LegalDraftBanner } from "@/components/legal/LegalDraftBanner";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms & competition rules",
  description:
    "The Bling Records Show terms of service and competition rules. Draft placeholder — must be reviewed by counsel before production launch.",
};

const SECTIONS = [
  {
    id: "eligibility",
    title: "1. Who can enter",
    body: [
      "The Bling Records Show is open to applicants who are 14 years old or older on the day they apply. Applicants under 18 must provide explicit guardian permission during registration; the guardian-consent checkbox on the register page is the binding form of that permission.",
      "Applicants must be Ethiopian residents or have an active legal right to perform in Ethiopia for the duration of the season. The site collects country and city during registration so that production can confirm logistics; falsifying that information is grounds for disqualification.",
      "Employees of Bling Records, Neo Studios, and members of their immediate families may not enter as contestants. They may apply for staff or referee roles separately.",
    ],
  },
  {
    id: "application",
    title: "2. The application",
    body: [
      "An application consists of: (a) registration on this site; (b) an audition video uploaded through our upload widget or pasted as a public URL; (c) the three explicit consents that ship with the registration form (rules, content rights, age / guardian); and (d) where applicable, the application fee.",
      "Applications are scored against a published rubric by an industry referee panel. Scoring criteria, weights, and the rubric template are described on the show-format page; results are transmitted through the result-checker page once a round closes.",
      "Submissions must be your own original work. Cover material, instrumentals, or beats licensed from third parties are evaluated case by case and must be declared during application — the content-rights policy describes the license scope you grant on submission.",
    ],
  },
  {
    id: "conduct",
    title: "3. Conduct & integrity",
    body: [
      "Impersonation, multi-account submission, paid voting (when audience voting is later introduced), bribing referees, manipulating scores, or any attempt to defraud the application process is grounds for immediate disqualification with no refund.",
      "Hate speech, harassment, sexually explicit content, or content that promotes violence will be flagged on submission and may be rejected. Repeat violations result in account suspension.",
      "Audition videos must depict the applicant performing themselves. Lip-syncing to an existing studio recording, or submitting another artist's performance as your own, will be rejected.",
    ],
  },
  {
    id: "disqualification",
    title: "4. Grounds for disqualification",
    body: [
      "We reserve the right to disqualify any contestant who: (a) provides false information during registration, including age or guardian status; (b) breaches the conduct provisions above; (c) withdraws guardian consent during the season; (d) violates any applicable Ethiopian law during the competition; or (e) brings the show into disrepute through public conduct.",
      "Disqualification decisions are recorded on the contestant's audit log. The decision is final once the season schedule has progressed past the relevant round; before that point, the contestant may dispute the decision via the contact form within 7 days.",
    ],
  },
  {
    id: "schedule",
    title: "5. Schedule, rounds & judging",
    body: [
      "The season runs in rounds. The current round is set in admin settings (current_round) and is visible on the contestant dashboard. The number of rounds, the cut-off thresholds, and the air-date schedule are confirmed by Bling Records and Neo Studios closer to season opening — see the show-format page for the public summary.",
      "Judging is performed by referees assigned via the admin assignment tool. Each submission is reviewed by at least three referees before a round-progression decision is published. Public-facing notes from referees are surfaced on the contestant's result page after the round closes; private panel notes are not shared.",
      "Round-progression decisions become final the moment they are published on the result-checker. Disputes lodged after publication may be reviewed at the producer's sole discretion.",
    ],
  },
  {
    id: "prizes",
    title: "6. Prizes",
    body: [
      "The headline prize is a Bling Records artist deal: studio time, distribution, and catalogue support. The full prize description, terms, and contract scope are confirmed in writing between the winning artist and Bling Records once the season concludes; this site provides a high-level summary on the show-format page.",
      "Runners-up and finalists may receive additional opportunities — feature spots, mentor sessions, or supporting roles in episodes. These are not guaranteed contractually; the artist deal is the only binding prize.",
      "Prizes are non-transferable and have no cash equivalent unless explicitly stated by Bling Records.",
    ],
  },
  {
    id: "fees",
    title: "7. Application fee",
    body: [
      "An application fee may apply. Whether it is required at the apply step or at shortlist is set by the producer in admin settings (fee_required_at) and is shown on the contestant payment page. The current fee amount is also surfaced there.",
      "All payments flow through AdmasPay / Telebirr hosted checkout. We do not store card numbers, account credentials, or one-time PINs. Webhook-confirmed transactions are reconciled into the contestant's payment history.",
      "The refund policy describes the conditions under which a fee may be refunded.",
    ],
  },
  {
    id: "liability",
    title: "8. Liability",
    body: [
      "The Bling Records Show is provided on an as-is basis. To the maximum extent permitted by Ethiopian law, neither Bling Records, Neo Studios, the production team, nor any referee is liable for indirect, consequential, special, or punitive damages arising from your application or participation.",
      "Our total liability for any claim arising out of this competition is limited to the application fee paid by the claimant, if any.",
      "Nothing in this section limits liability that cannot be limited under Ethiopian law (for example, liability for death or personal injury caused by negligence).",
    ],
  },
  {
    id: "law",
    title: "9. Governing law & disputes",
    body: [
      "These terms are governed by the laws of the Federal Democratic Republic of Ethiopia. Any dispute that cannot be resolved through the contact form within 30 days will be subject to the exclusive jurisdiction of the courts of Addis Ababa.",
      "If any clause of these terms is held invalid by a competent court, the remaining clauses remain in effect.",
    ],
  },
  {
    id: "changes",
    title: "10. Changes to these terms",
    body: [
      "These terms will be revised before public launch under counsel review. After public launch, material changes will be announced via email to registered contestants and via a banner on this site. Continued participation after a change constitutes acceptance of the revised terms.",
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="container py-12 md:py-20 max-w-3xl">
      <Badge variant="outline" className="mb-3">Legal</Badge>
      <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight">
        Terms &{" "}
        <span className="gradient-text">competition rules</span>
      </h1>
      <p className="mt-4 text-muted-foreground text-lg">
        Plain-language terms for entering The Bling Records Show. Read these
        before you apply — by submitting a registration you are agreeing to
        every section below.
      </p>

      <div className="mt-8">
        <LegalDraftBanner
          lastReviewed="2026-05-06"
          documentName="terms & competition rules document"
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

      <div className="mt-14 rounded-2xl border border-border/60 bg-card p-6">
        <p className="text-sm text-muted-foreground">
          Related: see our{" "}
          <Link href="/privacy" className="underline hover:text-foreground">
            privacy policy
          </Link>
          ,{" "}
          <Link
            href="/refund-policy"
            className="underline hover:text-foreground"
          >
            refund policy
          </Link>
          , and{" "}
          <Link
            href="/content-rights"
            className="underline hover:text-foreground"
          >
            content rights
          </Link>{" "}
          policy.
        </p>
        <Button asChild variant="gradient" size="lg" className="mt-5">
          <Link href="/register">
            Apply now <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
