import { z } from "zod";
import { ok, parseJson, route } from "@/lib/api";
import { getUserByEmail } from "@/lib/auth";
import { issueResetToken } from "@/lib/password-reset";
import { enforceRateLimit, ipFromRequest } from "@/lib/rate-limit";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().email(),
});

// 3 requests per 5 min per (IP + email-prefix) — keeps the spam vector small
// without blocking a legitimate user mid-flow. We bucket on the email's
// lowercased value so password-reset spam to one address can't nuke the
// limit for everyone behind a NAT.
const FP_LIMIT = 3;
const FP_WINDOW_MS = 5 * 60 * 1000;

export const POST = route(async (req: Request) => {
  const { email } = await parseJson(req, Body);
  const lowered = email.toLowerCase().trim();

  const ip = ipFromRequest(req);
  await enforceRateLimit({
    bucket: "auth.forgot-password",
    identifier: `${ip}:${lowered}`,
    limit: FP_LIMIT,
    windowMs: FP_WINDOW_MS,
  });

  const user = await getUserByEmail(lowered);

  // Always respond identically whether or not the email exists. This is the
  // only way to prevent the endpoint from being used as an account-existence
  // oracle. The internal flow only fires the "send email" branch when the
  // user is real.
  if (user) {
    const { token, expiresAt } = await issueResetToken(user.id);

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const link = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;

    // TODO(P7-T006): wire the transactional email provider (Postmark/Resend)
    // and remove the dev-only console.log. Until then, the dev / founder
    // reads the link from the server log to test the flow end-to-end.
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.log(
        `[auth.forgot-password] dev-only reset link (expires ${expiresAt.toISOString()}): ${link}`
      );
    }
  }

  return ok({
    sent: true,
    message:
      "If an account exists for that email, a password-reset link has been sent. Check your inbox (and spam folder).",
  });
});
