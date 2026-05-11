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
import { createContestant } from "@/lib/contestants";
import { contestantToDTO } from "@/lib/dto";
import { listProgress } from "@/lib/contestants";
import { issueVerificationToken } from "@/lib/email-verification";
import { notifyWelcome } from "@/lib/notify";

export const runtime = "nodejs";

// Phase 13: Ethiopia-market shape. Phone is the only required identifier;
// email is opt-in. Step-2 fields (category/experience/bio/socials) and the
// step-1 location/DOB are optional too — users can finish their profile
// later. The legacy three-checkbox consent collapses into a single flag.
const Body = z.object({
  fullName: z.string().min(2).max(120),
  stageName: z.string().max(60).optional().or(z.literal("")),
  phone: z.string().min(9).regex(/^[\d+\-\s()]+$/, "Numbers only"),
  email: z.string().email().optional().or(z.literal("")),
  password: z.string().min(8, "Password must be at least 8 characters"),
  age: z.coerce.number().int().min(13).max(99).optional(),
  dob: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  country: z.string().min(2).max(64).optional(),
  category: z
    .enum([
      "rap",
      "singing",
      "songwriter",
      "performance",
      "instruments",
      "other",
    ])
    .optional(),
  experience: z.string().optional().or(z.literal("")),
  bio: z.string().max(500).optional().or(z.literal("")),
  socialIg: z.string().max(120).optional().or(z.literal("")),
  socialTt: z.string().max(120).optional().or(z.literal("")),
  socialYt: z.string().max(120).optional().or(z.literal("")),
  agreedToTerms: z.literal(true, {
    errorMap: () => ({
      message: "Please confirm you agree to all the terms",
    }),
  }),
});

/**
 * Build a deterministic placeholder email when the contestant didn't give
 * one. The DB still requires a unique email per user (it's the login key);
 * synthesizing from the phone keeps that contract while letting users sign
 * up with phone-only. Format: `phone-{digits}@phone.brs.local`.
 */
function synthesizeEmail(phone: string): string {
  const digits = phone.replace(/\D+/g, "");
  return `phone-${digits}@phone.brs.local`;
}

export const POST = route(async (req: Request) => {
  const data = await parseJson(req, Body);

  const email = data.email && data.email.trim().length > 0
    ? data.email.trim().toLowerCase()
    : synthesizeEmail(data.phone);

  if (await getUserByEmail(email)) {
    // Different message depending on whether the conflict is on a
    // user-supplied email vs. a phone-derived placeholder, so the user
    // knows what to fix.
    if (data.email && data.email.trim().length > 0) {
      throw new ApiError(409, "An account with this email already exists");
    }
    throw new ApiError(409, "An account with this phone number already exists");
  }

  const userId = "u_" + crypto.randomBytes(8).toString("hex");
  const user = await createUser({
    id: userId,
    email,
    passwordHash: await hashPassword(data.password),
    role: "contestant",
    fullName: data.fullName,
  });

  // Default age to 18 when DOB is omitted — the contestants table requires
  // a non-null age but the user has confirmed 13+ via the consent flag.
  const age =
    typeof data.age === "number"
      ? data.age
      : data.dob
      ? ageFromDob(data.dob)
      : 18;

  const contestant = await createContestant({
    userId,
    stageName: data.stageName || null,
    phone: data.phone,
    age,
    dob: data.dob || null,
    city: data.city || "",
    country: data.country,
    // Default to "other" so the contestant can pick their category later
    // without us forcing it at sign-up.
    category: data.category ?? "other",
    experience: data.experience || "",
    bio: data.bio || "",
    socialIg: data.socialIg || null,
    socialTt: data.socialTt || null,
    socialYt: data.socialYt || null,
    // Legacy three-flag consent — populated together so the audit trail is
    // intact even though the UI collects a single confirmation.
    agreedToRules: data.agreedToTerms,
    agreedToRights: data.agreedToTerms,
    agreedToAge: data.agreedToTerms,
  });

  const session = await createSession({
    sub: user.id,
    role: user.role,
    email: user.email,
  });
  await setSessionCookie(session.token, session.expires);

  // P7-T007 / P7-T012: issue a verification token and fire the welcome email.
  // Skip if we synthesized a placeholder phone-only email — there's nothing
  // to deliver to.
  const userProvidedEmail = Boolean(data.email && data.email.trim().length > 0);
  if (userProvidedEmail) {
    try {
      const { token } = await issueVerificationToken(user.id);
      await notifyWelcome({
        userId: user.id,
        contestantId: contestant.id,
        verifyToken: token,
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn(
        JSON.stringify({
          level: "warn",
          evt: "register.notify_welcome_failed",
          error: e instanceof Error ? e.message : "unknown",
        })
      );
    }
  }

  const progress = await listProgress(contestant.id);
  return ok(
    { contestant: contestantToDTO(contestant, user, progress) },
    { status: 201 }
  );
});

function ageFromDob(dob: string): number {
  const d = new Date(dob);
  if (isNaN(d.getTime())) return 18;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}
