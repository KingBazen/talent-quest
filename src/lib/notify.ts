/**
 * Phase 7 (P7-T007 ... P7-T011): unified "notify the user" path.
 *
 * Every trigger point (registration, status change, payment success,
 * assignment) calls one of the helpers below. Each helper:
 *
 *   1. Reads the user's notification preferences.
 *   2. Sends an email if the user is opted in (default: yes).
 *   3. Records an in-app notification regardless of email pref — the inbox
 *      is the canonical record; opting out just stops emails, not history.
 *   4. Never throws. Email failure is logged but doesn't break the
 *      mutation that triggered the notification.
 *
 * Centralising this keeps the route handlers thin and the pref logic in one
 * place.
 */

import { sendEmail } from "./email";
import {
  welcomeEmail,
  statusChangeEmail,
  paymentReceiptEmail,
  refereeAssignmentEmail,
} from "./email-templates";
import { recordNotification } from "./notifications";
import { getPrefs, isOptedIn, type PrefKey } from "./notification-prefs";
import { getUserById } from "./auth";
import { listFollowerUserIds } from "./engagement";
import type { ContestantStatus } from "./dto-types";

function siteBaseUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

async function maybeSendEmail(input: {
  userId: string;
  prefKey: PrefKey | "always";
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  if (input.prefKey !== "always") {
    const prefs = await getPrefs(input.userId);
    if (!isOptedIn(prefs, input.prefKey)) return;
  }
  const r = await sendEmail({
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });
  if (!r.ok) {
    // eslint-disable-next-line no-console
    console.warn(
      JSON.stringify({
        level: "warn",
        evt: "notify.email_failed",
        provider: r.provider,
        error: r.error,
      })
    );
  }
}

// ─── P7-T007 / P7-T012: welcome + verify ────────────────────────────────────

export async function notifyWelcome(input: {
  userId: string;
  contestantId: string;
  verifyToken: string;
}): Promise<void> {
  const user = await getUserById(input.userId);
  if (!user) return;

  const verifyLink = `${siteBaseUrl()}/verify-email?token=${encodeURIComponent(
    input.verifyToken
  )}`;

  const tpl = welcomeEmail({
    fullName: user.full_name,
    contestantId: input.contestantId,
    verifyLink,
  });

  await maybeSendEmail({
    userId: user.id,
    prefKey: "always", // welcome + verify must always send
    to: user.email,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
  });

  await recordNotification({
    userId: user.id,
    kind: "contestant.welcome",
    title: tpl.subject,
    body: `Your contestant ID is ${input.contestantId}. Verify your email to activate your application.`,
    link: "/contestant/dashboard",
  });

  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log(
      `[notify.welcome] dev-only verify link: ${verifyLink}`
    );
  }
}

// ─── P7-T008: status-change ─────────────────────────────────────────────────

export async function notifyStatusChange(input: {
  userId: string;
  status: ContestantStatus;
  reason?: string | null;
}): Promise<void> {
  const user = await getUserById(input.userId);
  if (!user) return;

  const resultLink = `${siteBaseUrl()}/contestant/result`;
  const tpl = statusChangeEmail({
    fullName: user.full_name,
    status: input.status,
    reason: input.reason ?? null,
    resultLink,
  });

  await maybeSendEmail({
    userId: user.id,
    prefKey: "email_status_changes",
    to: user.email,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
  });

  await recordNotification({
    userId: user.id,
    kind: "contestant.status_change",
    title: tpl.subject,
    body: input.reason
      ? `Your application status changed: ${input.status}. Note: "${input.reason}"`
      : `Your application status changed to ${input.status}.`,
    link: "/contestant/result",
  });
}

// ─── P7-T009: payment receipt ───────────────────────────────────────────────

export async function notifyPaymentReceipt(input: {
  userId: string;
  amountText: string;
  reference: string;
  paidAtIso: string;
}): Promise<void> {
  const user = await getUserById(input.userId);
  if (!user) return;

  const paymentLink = `${siteBaseUrl()}/contestant/payment`;
  const tpl = paymentReceiptEmail({
    fullName: user.full_name,
    amountText: input.amountText,
    reference: input.reference,
    paymentLink,
    paidAtIso: input.paidAtIso,
  });

  await maybeSendEmail({
    userId: user.id,
    prefKey: "email_payment_updates",
    to: user.email,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
  });

  await recordNotification({
    userId: user.id,
    kind: "payment.receipt",
    title: tpl.subject,
    body: `Reference ${input.reference}. ${input.amountText} received.`,
    link: "/contestant/payment",
  });
}

// ─── P8-T010: contestant engagement (follow / like / comment) ───────────────

export async function notifyContestantOfFollow(input: {
  contestantUserId: string;
  followerDisplay: string;
  contestantId: string;
}): Promise<void> {
  // Contestants don't get an email for every follow — too noisy. The in-app
  // inbox is the only surface. If we ever wire a digest, this is the place.
  const user = await getUserById(input.contestantUserId);
  if (!user) return;
  await recordNotification({
    userId: user.id,
    kind: "engagement.follow",
    title: "New follower",
    body: `${input.followerDisplay} started following you.`,
    link: `/contestants/${input.contestantId}`,
  });
}

export async function notifyContestantOfComment(input: {
  contestantUserId: string;
  commenterDisplay: string;
  commentExcerpt: string;
  contestantId: string;
}): Promise<void> {
  const user = await getUserById(input.contestantUserId);
  if (!user) return;
  const excerpt =
    input.commentExcerpt.length > 80
      ? input.commentExcerpt.slice(0, 80) + "…"
      : input.commentExcerpt;
  await recordNotification({
    userId: user.id,
    kind: "engagement.comment",
    title: `${input.commenterDisplay} commented`,
    body: excerpt,
    link: `/contestants/${input.contestantId}`,
  });
}

// ─── P8-T006: notify followers when their contestant advances ────────────────

export async function notifyFollowersOfStatusChange(input: {
  contestantId: string;
  contestantDisplay: string;
  status: ContestantStatus;
}): Promise<void> {
  const followerIds = await listFollowerUserIds(input.contestantId);
  for (const followerUserId of followerIds) {
    try {
      await recordNotification({
        userId: followerUserId,
        kind: "engagement.follow_advance",
        title: `${input.contestantDisplay} just advanced`,
        body: `${input.contestantDisplay} is now ${input.status}. Tap to cheer them on.`,
        link: `/contestants/${input.contestantId}`,
      });
    } catch {
      // best-effort; don't break a bulk publish on one bad follower row
    }
  }
}

// ─── P7-T010: referee assignment ────────────────────────────────────────────

export async function notifyRefereeAssignment(input: {
  refereeUserId: string;
  contestantStageName: string;
  category: string;
  submissionId: string;
}): Promise<void> {
  const user = await getUserById(input.refereeUserId);
  if (!user) return;

  const submissionLink = `${siteBaseUrl()}/referee/submissions/${input.submissionId}`;
  const tpl = refereeAssignmentEmail({
    fullName: user.full_name,
    contestantStageName: input.contestantStageName,
    category: input.category,
    submissionLink,
  });

  await maybeSendEmail({
    userId: user.id,
    prefKey: "email_referee_assignments",
    to: user.email,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
  });

  await recordNotification({
    userId: user.id,
    kind: "referee.assignment",
    title: tpl.subject,
    body: `${input.contestantStageName} (${input.category}) is in your queue.`,
    link: `/referee/submissions/${input.submissionId}`,
  });
}
