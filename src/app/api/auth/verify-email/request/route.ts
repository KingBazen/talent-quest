import { ok, route } from "@/lib/api";
import { ApiError, getUserById, readSession } from "@/lib/auth";
import { issueVerificationToken } from "@/lib/email-verification";
import { sendEmail } from "@/lib/email";
import { verifyEmail as verifyEmailTemplate } from "@/lib/email-templates";
import { enforceRateLimit, ipFromRequest } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * Phase 7 (P7-T012): re-issue a verification email.
 *
 * Used by:
 *   - the contestant dashboard's "Resend verification" button
 *   - the registration handler (called once at signup; see register/route.ts)
 *
 * Rate-limited at 3 requests / 15 min / user — the issue cost is real (we
 * write a row + send an email) and there's no legitimate need to re-spam.
 */

const REQ_LIMIT = 3;
const REQ_WINDOW_MS = 15 * 60 * 1000;

export const POST = route(async (req: Request) => {
  const session = await readSession();
  if (!session) throw new ApiError(401, "Sign in to verify your email");

  await enforceRateLimit({
    bucket: "auth.verify-email-request",
    identifier: `${ipFromRequest(req)}:${session.sub}`,
    limit: REQ_LIMIT,
    windowMs: REQ_WINDOW_MS,
  });

  const user = await getUserById(session.sub);
  if (!user) throw new ApiError(401, "Sign in to verify your email");
  if (user.email_verified_at) {
    return ok({ alreadyVerified: true });
  }

  const { token, expiresAt } = await issueVerificationToken(user.id);
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const verifyLink = `${baseUrl}/verify-email?token=${encodeURIComponent(token)}`;

  const tpl = verifyEmailTemplate({
    fullName: user.full_name,
    verifyLink,
  });
  const result = await sendEmail({
    to: user.email,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
  });

  // Mirror the dev-only console-log behaviour of forgot-password so a
  // developer with no email provider configured can still finish the flow.
  if (result.provider === "console" && process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log(
      `[auth.verify-email] dev-only verify link (expires ${expiresAt.toISOString()}): ${verifyLink}`
    );
  }

  return ok({ sent: true, provider: result.provider });
});
