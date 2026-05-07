import Link from "next/link";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { LegalDraftBanner } from "@/components/legal/LegalDraftBanner";

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "How The Bling Records Show collects, uses, and protects contestant data. Draft placeholder — must be reviewed by counsel before production launch.",
};

const SECTIONS = [
  {
    id: "what-we-collect",
    title: "1. What we collect",
    body: [
      "When you register as a contestant we ask for: full name, stage name (optional), email, phone, date of birth (we derive your age and flag the under-18 path automatically), city, country, social handles (Instagram / TikTok / YouTube — optional), and your music category. We also collect three explicit consents: rules acceptance, content-rights grant, and age / guardian permission.",
      "When you submit an audition video we collect: the video file itself (or the URL you paste), basic media metadata (duration, format, dimensions, file size), and the time of submission. Videos are stored on Cloudinary; we keep the public URL and the Cloudinary public ID.",
      "When you pay an application fee we collect: the amount, currency, AdmasPay / Telebirr provider reference, the status of the transaction, and webhook payload (with secret fields redacted) for audit purposes. We do not see or store card numbers, account credentials, or one-time PINs — those stay with the payment provider.",
      "When you contact us through the contact form we collect: your name, email, the topic you selected, and the message body.",
      "We do not collect IP addresses for analytics. We do log them transiently for rate-limiting on login and result-checker lookups; these logs are not retained beyond the rate-limit window.",
    ],
  },
  {
    id: "how-we-use-it",
    title: "2. How we use it",
    body: [
      "Running the competition: matching you to a contestant ID, routing your audition video to the referee panel, computing scores, publishing results to the result-checker, and informing you of round-progression decisions.",
      "Communication: status-change emails (on each pipeline transition), the welcome email after registration, and payment receipts. The transactional email provider has not yet been wired in — the relevant emails are tracked under tasks P7-T006 through P7-T010 and are only enabled once that work lands.",
      "Operations & support: replying to your contact-form messages and resolving payment disputes via the admin reconciliation tool.",
      "Analytics, audit, and fraud detection: tracking who changed what (audit_logs) so producers and referees stay accountable. Audit entries record the actor, the target, the action, and a structured payload — they never store passwords, payment secrets, or personal narrative content.",
      "We do not sell or rent your data to third parties. We do not use your data to train AI models.",
    ],
  },
  {
    id: "who-sees-it",
    title: "3. Who sees what",
    body: [
      "Public visitors see only your stage name (or initials if you didn't set one) and the public-facing referee notes after a round closes. They never see your full name, email, phone, date of birth, exact city, or payment details.",
      "Referees see an anonymised view of your submission: stage name (or initials), submission video, category, music style metadata. They do not see your full name, email, phone, DOB, city, or payment status.",
      "Admins (the producer team at Bling Records and Neo Studios) see the full record: registration data, all submissions, payment history, and the audit log. Admin access is gated by role-based access control and is itself audit-logged.",
      "Service providers see only what they need to operate: Cloudinary stores video files; AdmasPay / Telebirr processes payments; Postmark or Resend (when configured) sends emails. Each provider has its own privacy policy that governs the data they handle on our behalf.",
    ],
  },
  {
    id: "retention",
    title: "4. How long we keep it",
    body: [
      "Active season data: kept for the full duration of the season plus six months for any post-show contractual or audit purposes.",
      "After that window, contestant records are anonymised: full name, email, phone, DOB, social handles, and contact-form messages are erased; the audit log retains anonymised pointers (e.g. \"contestant c_… status changed\") so historical decisions remain auditable.",
      "If you withdraw via the danger-zone control on /contestant/profile, your record is soft-deleted immediately: you cannot log in any more, and your profile is hidden from referees. Hard deletion happens at the end of the same retention window above.",
      "Audit log entries themselves are never deleted from the UI — they are append-only by design. After the retention window the entries pointing at deleted records are pseudonymised, not erased, so the integrity of the audit chain is preserved.",
    ],
  },
  {
    id: "your-rights",
    title: "5. Your rights",
    body: [
      "Access: log in and visit /contestant/profile and /contestant/application to see the full record we hold about you.",
      "Correction: edit safe fields (stage name, phone, city, country, bio, experience, social handles) directly on /contestant/profile. Locked fields (full name, email, DOB, age, category, consent timestamps) can be corrected by request via the contact form — we ask for proof of identity before a locked-field correction.",
      "Withdrawal: use the danger-zone control on /contestant/profile to withdraw. This is a soft delete that takes effect immediately.",
      "Deletion: full deletion is processed at the end of the retention window (see above) or sooner on request via the contact form. Deletion of audit log entries themselves is not possible — those are pseudonymised, not erased.",
      "Complaint: you have the right to lodge a complaint with the relevant Ethiopian data-protection authority once that authority is operational under the new framework. Contact details will be added to this section before public launch.",
    ],
  },
  {
    id: "cookies",
    title: "6. Cookies & local storage",
    body: [
      "We set one cookie: tq_session. It is HTTP-only, SameSite=Lax, and lives for 14 days. It carries a signed JWT that proves you are logged in. We do not set advertising cookies.",
      "We use browser local storage for one purpose: remembering your registration form draft (under the key brs.register.draft.v1) so you can resume across reload. We deliberately exclude your password and the three consents from that draft so a shared device cannot auto-resume into a pre-checked consent.",
    ],
  },
  {
    id: "children",
    title: "7. Children & guardian consent",
    body: [
      "Contestants under 18 must provide guardian permission during registration. The guardian-consent checkbox on the register page is the binding form of that permission.",
      "If you are a parent or guardian and you believe your child has registered without permission, contact us via the contact form and we will withdraw the registration immediately.",
      "We do not process data of children under 14. If we discover such data we delete it.",
    ],
  },
  {
    id: "security",
    title: "8. Security",
    body: [
      "Passwords are hashed with bcrypt before storage; we never see the plaintext after registration. Authentication tokens are signed with a server-side JWT secret; revocation cycles the secret.",
      "Sessions are protected by SameSite=Lax cookies and a Sec-Fetch-Site CSRF check on every mutating endpoint.",
      "Login and result-checker lookups are rate-limited per IP; the production deployment uses Upstash Redis as the rate-limit backend.",
      "Despite our controls, no online service is perfectly secure. If you suspect a breach, contact us via the contact form and we will follow our incident process — including notifying you within the time required by Ethiopian law.",
    ],
  },
  {
    id: "changes",
    title: "9. Changes to this policy",
    body: [
      "This policy will be revised before public launch under counsel review. Material changes after launch will be announced via email to registered contestants and via a banner on this site.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="container py-12 md:py-20 max-w-3xl">
      <Badge variant="outline" className="mb-3">Legal</Badge>
      <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight">
        Privacy{" "}
        <span className="gradient-text">policy</span>
      </h1>
      <p className="mt-4 text-muted-foreground text-lg">
        What we collect when you apply, who sees it, how long we keep it, and
        the controls you have over it.
      </p>

      <div className="mt-8">
        <LegalDraftBanner
          lastReviewed="2026-05-06"
          documentName="privacy policy"
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
        <Link href="/refund-policy" className="underline hover:text-foreground">
          refund policy
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
