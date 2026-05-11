import { z } from "zod";
import { ok, parseJson, route } from "@/lib/api";
import { ApiError, requireRole, getUserById } from "@/lib/auth";
import {
  getContestantByUserId,
  listProgress,
} from "@/lib/contestants";
import { updateContestantSelf } from "@/lib/contestants-extras";
import { contestantToDTO } from "@/lib/dto";

export const runtime = "nodejs";

/**
 * Edit the logged-in contestant's profile. Only safe fields are accepted —
 * DOB, age, category, email, full_name, and the consent timestamps are
 * intentionally not editable here:
 *   - DOB / age are eligibility-sensitive (under-18 guardian flow).
 *   - Category change mid-season needs admin sign-off.
 *   - Email + full_name belong on a separate auth-sensitive flow.
 *   - Consent timestamps are audit-immutable.
 */
// Phase 13: align with the Ethiopia-market registration shape — the only
// hard requirement here is `phone` (login key). The rest are optional and
// may arrive as empty strings when the user is still filling things in.
const Body = z.object({
  stageName: z.string().max(60).optional().or(z.literal("")),
  phone: z
    .string()
    .min(9)
    .regex(/^[\d+\-\s()]+$/, "Numbers only")
    .optional(),
  city: z.string().max(120).optional().or(z.literal("")),
  country: z.string().min(2).max(64).optional(),
  bio: z.string().max(500).optional().or(z.literal("")),
  experience: z.string().optional().or(z.literal("")),
  socialIg: z.string().max(120).optional().or(z.literal("")),
  socialTt: z.string().max(120).optional().or(z.literal("")),
  socialYt: z.string().max(120).optional().or(z.literal("")),
});

export const PATCH = route(async (req: Request) => {
  const session = await requireRole("contestant");
  const c = await getContestantByUserId(session.sub);
  if (!c) throw new ApiError(404, "No contestant profile");
  if (c.withdrawn_at) throw new ApiError(403, "Account withdrawn");

  const data = await parseJson(req, Body);
  await updateContestantSelf(c.id, {
    stageName: data.stageName === "" ? null : data.stageName,
    phone: data.phone,
    city: data.city,
    country: data.country,
    bio: data.bio,
    experience: data.experience,
    socialIg: data.socialIg === "" ? null : data.socialIg,
    socialTt: data.socialTt === "" ? null : data.socialTt,
    socialYt: data.socialYt === "" ? null : data.socialYt,
  });

  const fresh = (await getContestantByUserId(session.sub))!;
  const user = (await getUserById(session.sub))!;
  const progress = await listProgress(fresh.id);
  return ok({ contestant: contestantToDTO(fresh, user, progress) });
});
