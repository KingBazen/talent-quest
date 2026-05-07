/**
 * Phase 7 (P7-T007 ... P7-T010): transactional email templates.
 *
 * One small render function per template. Each returns { subject, html, text }
 * so the call site can pass the result straight to sendEmail().
 *
 * Design notes:
 * - Plain HTML, table-based for old-Outlook compatibility, no external CSS.
 * - Inline brand colours so the template is self-contained.
 * - Every template ships a text alternative — without it, spam filters
 *   penalise the message and screen readers struggle.
 * - Anti-phishing footer that names the show + says "we will never ask for
 *   passwords by email."
 */

import { statusCopy } from "./status-copy";
import type { ContestantStatus } from "./dto-types";

type Lang = "en" | "am";

const BRAND = {
  bg: "#0b0b0d",
  card: "#16161a",
  border: "#27272f",
  text: "#f5f5f7",
  mute: "#a1a1aa",
  accent: "#f0c674",
  accent2: "#dc2626",
};

interface RenderShellInput {
  preheader: string;
  heading: string;
  paragraphs: string[];
  cta?: { label: string; href: string };
  footnote?: string;
}

function renderShell(input: RenderShellInput): { html: string; text: string } {
  const ctaHtml = input.cta
    ? `<tr><td style="padding:24px 0 8px 0;">
        <a href="${input.cta.href}"
           style="display:inline-block;background:linear-gradient(90deg,${BRAND.accent},#e2a73f);color:#0b0b0d;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:10px;">
           ${escapeHtml(input.cta.label)}
        </a>
      </td></tr>`
    : "";

  const paraHtml = input.paragraphs
    .map(
      (p) =>
        `<tr><td style="padding:6px 0;color:${BRAND.text};font-size:15px;line-height:1.55;">${escapeHtml(p)}</td></tr>`
    )
    .join("");

  const footnote = input.footnote
    ? `<tr><td style="padding-top:18px;color:${BRAND.mute};font-size:12px;line-height:1.5;">${escapeHtml(input.footnote)}</td></tr>`
    : "";

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>${escapeHtml(input.heading)}</title></head>
<body style="margin:0;padding:0;background:${BRAND.bg};color:${BRAND.text};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<span style="display:none;font-size:1px;color:${BRAND.bg};line-height:1px;max-height:0;overflow:hidden;">${escapeHtml(input.preheader)}</span>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BRAND.bg};">
  <tr><td align="center" style="padding:36px 16px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;background:${BRAND.card};border:1px solid ${BRAND.border};border-radius:16px;">
      <tr><td style="padding:28px 28px 6px 28px;">
        <p style="margin:0;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:${BRAND.mute};">The Bling Records Show</p>
        <h1 style="margin:6px 0 14px 0;font-size:24px;line-height:1.2;color:${BRAND.text};">${escapeHtml(input.heading)}</h1>
      </td></tr>
      <tr><td style="padding:0 28px 22px 28px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          ${paraHtml}
          ${ctaHtml}
          ${footnote}
        </table>
      </td></tr>
    </table>
    <p style="font-size:11px;color:${BRAND.mute};margin:18px 0 0 0;">
      Bling Records × Neo Studios · Addis Ababa · We will never ask for your password by email.
    </p>
  </td></tr>
</table>
</body></html>`;

  const textParts = [
    input.heading,
    "",
    ...input.paragraphs,
    input.cta ? `\n${input.cta.label}: ${input.cta.href}` : "",
    input.footnote ? `\n${input.footnote}` : "",
    "",
    "— The Bling Records Show",
    "Bling Records × Neo Studios · Addis Ababa",
    "We will never ask for your password by email.",
  ].filter(Boolean);

  return { html, text: textParts.join("\n") };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ─── P7-T007: welcome email ──────────────────────────────────────────────────

export function welcomeEmail(input: {
  fullName: string;
  contestantId: string;
  verifyLink: string;
}): { subject: string; html: string; text: string } {
  const subject = "Welcome to The Bling Records Show";
  const { html, text } = renderShell({
    preheader: `Your contestant ID is ${input.contestantId}. Verify your email to keep your application active.`,
    heading: `Welcome, ${input.fullName}.`,
    paragraphs: [
      `Your contestant ID is ${input.contestantId}. Save it — you'll use it to track your progress on the result-checker.`,
      "Before you submit your audition, please verify your email address. We use it to send status updates after each round.",
      "If you didn't apply to The Bling Records Show, just ignore this email — your address will be removed within 24 hours.",
    ],
    cta: { label: "Verify your email", href: input.verifyLink },
    footnote:
      "The link expires in 30 minutes. If it expires, request a new one from the dashboard.",
  });
  return { subject, html, text };
}

// ─── P7-T012: standalone verify-email re-request ─────────────────────────────

export function verifyEmail(input: { fullName: string; verifyLink: string }): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = "Verify your email — The Bling Records Show";
  const { html, text } = renderShell({
    preheader:
      "One quick click to verify your email and keep your application active.",
    heading: `Verify your email, ${input.fullName}.`,
    paragraphs: [
      "Tap the button below to confirm we have the right address. Without verification, you can't move past the registered step.",
    ],
    cta: { label: "Verify email", href: input.verifyLink },
    footnote:
      "The link expires in 30 minutes. If it wasn't you, ignore this email.",
  });
  return { subject, html, text };
}

// ─── P7-T008: status-change email ────────────────────────────────────────────

export function statusChangeEmail(input: {
  fullName: string;
  status: ContestantStatus;
  reason?: string | null;
  resultLink: string;
  lang?: Lang;
}): { subject: string; html: string; text: string } {
  const lang: Lang = input.lang ?? "en";
  const c = statusCopy(input.status, lang);
  const subject = `${c.label} — The Bling Records Show`;
  const paragraphs = [
    `${input.fullName}, your application status is now: ${c.label}.`,
    c.description,
  ];
  if (c.nextStep) paragraphs.push(`Next step: ${c.nextStep}`);
  if (input.reason) paragraphs.push(`Note from the producer team: "${input.reason}"`);
  const { html, text } = renderShell({
    preheader: c.description.slice(0, 100),
    heading: c.label,
    paragraphs,
    cta: { label: "View your result", href: input.resultLink },
    footnote:
      "Want to stop receiving status emails? Update your preferences on /contestant/preferences.",
  });
  return { subject, html, text };
}

// ─── P7-T009: payment receipt ────────────────────────────────────────────────

export function paymentReceiptEmail(input: {
  fullName: string;
  amountText: string; // pre-formatted, e.g. "ETB 5,000.00"
  reference: string;
  paymentLink: string;
  paidAtIso: string;
}): { subject: string; html: string; text: string } {
  const subject = `Payment received — ${input.amountText}`;
  const dt = new Date(input.paidAtIso);
  const dtText = isNaN(dt.getTime())
    ? input.paidAtIso
    : dt.toUTCString();
  const { html, text } = renderShell({
    preheader: `${input.amountText} received. Reference ${input.reference}.`,
    heading: `Payment received.`,
    paragraphs: [
      `Thank you, ${input.fullName}. We've received your application fee of ${input.amountText}.`,
      `Reference: ${input.reference}`,
      `Date: ${dtText}`,
      "If anything looks wrong, reply to this email or use the contact form within 14 days.",
    ],
    cta: { label: "View payment history", href: input.paymentLink },
    footnote:
      "This email is your receipt. Refund eligibility is described on /refund-policy.",
  });
  return { subject, html, text };
}

// ─── P7-T010: referee-assignment email ───────────────────────────────────────

export function refereeAssignmentEmail(input: {
  fullName: string;
  contestantStageName: string;
  category: string;
  submissionLink: string;
}): { subject: string; html: string; text: string } {
  const subject = `New audition assigned — ${input.contestantStageName}`;
  const { html, text } = renderShell({
    preheader:
      "An admin has added a new audition to your review queue. It's waiting for your score.",
    heading: "New audition assigned to you.",
    paragraphs: [
      `${input.fullName}, an admin has added a new audition to your review queue.`,
      `Category: ${input.category}`,
      `Contestant: ${input.contestantStageName} (anonymised — referee view)`,
      "Open the link below to review the video, score the rubric, and add your notes.",
    ],
    cta: { label: "Open the audition", href: input.submissionLink },
    footnote:
      "Stop receiving assignment emails: update your preferences on /referee/preferences.",
  });
  return { subject, html, text };
}
