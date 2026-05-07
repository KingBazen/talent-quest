import { z } from "zod";
import { ok, parseJson, route } from "@/lib/api";
import { ApiError, readSession } from "@/lib/auth";
import { getPrefs, setPrefs } from "@/lib/notification-prefs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Phase 7 (P7-T011): notification preferences.
 *
 * GET  /api/me/preferences  → current toggles for the signed-in user.
 * PATCH /api/me/preferences { email_status_changes?, email_payment_updates?, email_referee_assignments? }
 */

export const GET = route(async () => {
  const session = await readSession();
  if (!session) throw new ApiError(401, "Sign in");
  const prefs = await getPrefs(session.sub);
  return ok({ prefs });
});

const PatchBody = z.object({
  email_status_changes: z.boolean().optional(),
  email_payment_updates: z.boolean().optional(),
  email_referee_assignments: z.boolean().optional(),
});

export const PATCH = route(async (req: Request) => {
  const session = await readSession();
  if (!session) throw new ApiError(401, "Sign in");
  const data = await parseJson(req, PatchBody);
  const prefs = await setPrefs(session.sub, data);
  return ok({ prefs });
});
