import crypto from "node:crypto";
import { z } from "zod";
import { ok, parseJson, route } from "@/lib/api";
import {
  ApiError,
  createSession,
  createUser,
  getUserByEmail,
  hashPassword,
  setSessionCookie,
} from "@/lib/auth";
import { issueVerificationToken } from "@/lib/email-verification";
import { sendEmail } from "@/lib/email";
import { verifyEmail as verifyEmailTemplate } from "@/lib/email-templates";

export const runtime = "nodejs";

/**
 * Phase 8 (P8-T002): audience (fan) account registration.
 *
 * Reuses the existing users table via the new `audience` role. Slimmer body
 * than the contestant register flow — no DOB, no consents, no contestant
 * profile fields. Just enough to log in, verify email, and engage.
 *
 * The verify-email path is shared with contestants. Audience users can comment
 * + like + follow without verifying, but the email-on-engagement path
 * (P8-T010) only fires for verified addresses.
 */

const Body = z.object({
  fullName: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  /** Phase 12: same mobile-vs-web split as login — mobile receives the
   *  JWT in the body, web receives the cookie. */
  audience: z.enum(["web", "mobile"]).optional(),
});

export const POST = route(async (req: Request) => {
  const data = await parseJson(req, Body);

  if (await getUserByEmail(data.email)) {
    throw new ApiError(409, "An account with this email already exists");
  }

  const userId = "u_" + crypto.randomBytes(8).toString("hex");
  const user = await createUser({
    id: userId,
    email: data.email,
    passwordHash: await hashPassword(data.password),
    role: "audience",
    fullName: data.fullName,
  });

  const session = await createSession({
    sub: user.id,
    role: user.role,
    email: user.email,
  });
  if (data.audience !== "mobile") {
    await setSessionCookie(session.token, session.expires);
  }

  // Fire a verify-email link. Same template the contestant flow uses.
  // Failures are non-fatal — the user can request a re-send later.
  try {
    const { token, expiresAt } = await issueVerificationToken(user.id);
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const link = `${baseUrl}/verify-email?token=${encodeURIComponent(token)}`;
    const tpl = verifyEmailTemplate({ fullName: user.full_name, verifyLink: link });
    await sendEmail({
      to: user.email,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
    });
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.log(
        `[audience.register] dev-only verify link (expires ${expiresAt.toISOString()}): ${link}`
      );
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn(
      JSON.stringify({
        level: "warn",
        evt: "audience.register.notify_failed",
        error: e instanceof Error ? e.message : "unknown",
      })
    );
  }

  return ok(
    {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
      },
      ...(data.audience === "mobile"
        ? { token: session.token, expiresAt: session.expires.toISOString() }
        : {}),
    },
    { status: 201 }
  );
});
