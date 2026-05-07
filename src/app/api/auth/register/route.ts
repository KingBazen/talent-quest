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

const Body = z.object({
  fullName: z.string().min(2).max(120),
  stageName: z.string().max(60).optional().or(z.literal("")),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().min(9).regex(/^[\d+\-\s()]+$/, "Numbers only"),
  age: z.coerce.number().int().min(13).max(99),
  dob: z.string().optional().or(z.literal("")),
  city: z.string().min(2),
  country: z.string().min(2).max(64).optional(),
  category: z.enum([
    "rap",
    "singing",
    "songwriter",
    "performance",
    "instruments",
    "other",
  ]),
  experience: z.string().min(1),
  bio: z.string().min(20).max(500),
  socialIg: z.string().max(120).optional().or(z.literal("")),
  socialTt: z.string().max(120).optional().or(z.literal("")),
  socialYt: z.string().max(120).optional().or(z.literal("")),
  agreedToRules: z.literal(true, {
    errorMap: () => ({ message: "You must accept the entry rules" }),
  }),
  agreedToRights: z.literal(true, {
    errorMap: () => ({ message: "You must accept the content licensing terms" }),
  }),
  agreedToAge: z.literal(true, {
    errorMap: () => ({ message: "You must confirm your age (and guardian permission if under 18)" }),
  }),
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
    role: "contestant",
    fullName: data.fullName,
  });

  const contestant = await createContestant({
    userId,
    stageName: data.stageName || null,
    phone: data.phone,
    age: data.age,
    dob: data.dob || null,
    city: data.city,
    country: data.country,
    category: data.category,
    experience: data.experience,
    bio: data.bio,
    socialIg: data.socialIg || null,
    socialTt: data.socialTt || null,
    socialYt: data.socialYt || null,
    agreedToRules: data.agreedToRules,
    agreedToRights: data.agreedToRights,
    agreedToAge: data.agreedToAge,
  });

  const session = await createSession({
    sub: user.id,
    role: user.role,
    email: user.email,
  });
  await setSessionCookie(session.token, session.expires);

  // P7-T007 / P7-T012: issue a verification token and fire the welcome email.
  // We don't await failures from notify — the registration must succeed even
  // if the email provider is down (the user can request a re-send from the
  // dashboard).
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

  const progress = await listProgress(contestant.id);
  return ok(
    { contestant: contestantToDTO(contestant, user, progress) },
    { status: 201 }
  );
});
