import Link from "next/link";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { LegalDraftBanner } from "@/components/legal/LegalDraftBanner";

export const metadata: Metadata = {
  title: "Refund policy",
  description:
    "When the application fee can be refunded and how to request a refund. Draft placeholder — must be reviewed by counsel before production launch.",
};

const SECTIONS = [
  {
    id: "fee",
    title: "1. The application fee",
    body: [
      "Whether an application fee is required, and at which step (apply or shortlist), is configurable by the producer in admin settings (fee_required_at). The current fee amount is shown on /contestant/payment when you log in.",
      "Fees are paid through AdmasPay / Telebirr hosted checkout. We never see your card number, account credentials, or one-time PIN — those go directly from your bank or mobile-money account to the payment provider.",
    ],
  },
  {
    id: "refundable",
    title: "2. When a refund is available",
    body: [
      "Producer error: if you are charged in error (for example, the fee setting is mid-change at the moment of payment, or you are charged twice for the same submission), we refund the duplicated or erroneous payment in full.",
      "Disqualification by us: if we disqualify you for reasons not arising from your conduct (e.g. a category is cancelled or a season is rescheduled in a way that excludes you), the fee is refunded in full.",
      "Withdrawal before the round closes: if you withdraw via the danger-zone control on /contestant/profile within 7 days of paying, and before the round in which you paid has closed, we refund the fee in full.",
      "Edge cases: if you believe you have a refund case that is not described above, contact us via the contact form. The producer reviews edge cases case-by-case using the audit log on the payment record.",
    ],
  },
  {
    id: "non-refundable",
    title: "3. When a refund is NOT available",
    body: [
      "Conduct-based disqualification: if you are disqualified under the conduct provisions of the terms (impersonation, fraud, falsifying age or guardian status, hate speech, repeat content violations), the fee is forfeit.",
      "Round closed: once the round in which you paid has closed and the score has been published to the result-checker, the fee is non-refundable. The fee is consideration for the panel's review work, and that work has been performed once a score is published.",
      "Change of heart: \"I changed my mind after the round closed\" is not a refund case. Withdraw before the round closes to qualify under §2 above.",
      "Failed payment: if a payment failed on the AdmasPay side, no money has been taken — there is nothing to refund. Contact us via the contact form if your bank statement disagrees with our records.",
    ],
  },
  {
    id: "how-to-request",
    title: "4. How to request a refund",
    body: [
      "Send a message via the contact form. Include the payment reference (visible on /contestant/payment) and a short description of which §2 case applies.",
      "We acknowledge receipt within 3 business days and confirm a decision within 10 business days. If the case requires producer review (edge cases under §2.4) we may extend this window once with a written explanation.",
      "If we approve the refund, the producer issues it through the AdmasPay merchant dashboard and records the transaction in our admin payments tool. The funds typically reach your account within 5–14 business days after issuance, depending on your bank and AdmasPay's processing times.",
    ],
  },
  {
    id: "process",
    title: "5. How refunds are processed internally",
    body: [
      "Refunds happen in two steps inside our admin tool: a request step (which records the case but does not change the payment status) and a complete step (which flips the status to refunded once the producer has issued the refund through AdmasPay's merchant dashboard).",
      "Both steps require a written reason on our side, which is recorded on the payment's audit log. If you ever need to dispute a refund decision, the audit log is the canonical record.",
      "We do not call AdmasPay's refund API automatically. The producer issues the refund out-of-band so that finance and operations stay manually accountable for every monetary movement during the pre-launch period.",
    ],
  },
  {
    id: "disputes",
    title: "6. Disputes",
    body: [
      "If a refund decision is in dispute and the contact-form route has been exhausted (we have replied with our final position), you have 14 days to lodge a formal dispute, also via the contact form. A formal dispute escalates to Bling Records leadership and triggers a final written decision within 30 days.",
      "Dispute decisions made by Bling Records leadership are final on our side. If you remain unsatisfied, you may pursue any rights available to you under Ethiopian consumer-protection law; see also the governing-law section of the terms.",
    ],
  },
];

export default function RefundPolicyPage() {
  return (
    <div className="container py-12 md:py-20 max-w-3xl">
      <Badge variant="outline" className="mb-3">Legal</Badge>
      <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight">
        Refund{" "}
        <span className="gradient-text">policy</span>
      </h1>
      <p className="mt-4 text-muted-foreground text-lg">
        When you can ask for the application fee back, and how the process
        works on our side.
      </p>

      <div className="mt-8">
        <LegalDraftBanner
          lastReviewed="2026-05-06"
          documentName="refund policy"
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
        <Link
          href="/content-rights"
          className="underline hover:text-foreground"
        >
          content rights
        </Link>
        .
      </div>
    </div>
  );
}
