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

export const runtime = "nodejs";

const Body = z.object({
  fullName: z.string().min(2).max(120),
  stageName: z.string().max(60).optional().or(z.literal("")),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().min(9).regex(/^[\d+\-\s()]+$/, "Numbers only"),
  age: z.coerce.number().int().min(13).max(99),
  city: z.string().min(2),
  category: z.enum([
    "singing",
    "dancing",
    "acting",
    "comedy",
    "instruments",
    "other",
  ]),
  experience: z.string().min(1),
  bio: z.string().min(20).max(500),
  agreedToTerms: z.literal(true, {
    errorMap: () => ({ message: "You must accept the terms" }),
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
    city: data.city,
    category: data.category,
    experience: data.experience,
    bio: data.bio,
    agreedToTerms: true,
  });

  const session = await createSession({
    sub: user.id,
    role: user.role,
    email: user.email,
  });
  await setSessionCookie(session.token, session.expires);

  const progress = await listProgress(contestant.id);
  return ok(
    { contestant: contestantToDTO(contestant, user, progress) },
    { status: 201 }
  );
});
