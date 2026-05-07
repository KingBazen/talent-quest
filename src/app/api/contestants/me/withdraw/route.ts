import { ok, route } from "@/lib/api";
import {
  ApiError,
  clearSessionCookie,
  requireRole,
} from "@/lib/auth";
import { getContestantByUserId } from "@/lib/contestants";
import { withdrawContestant } from "@/lib/contestants-extras";

export const runtime = "nodejs";

/**
 * Soft-delete the logged-in contestant's record. The row stays — only
 * `withdrawn_at` is set — so scores, payments, and audit history survive.
 * The session cookie is cleared so the user is signed out immediately;
 * subsequent login attempts are rejected by the login route's withdrawn check.
 */
export const POST = route(async () => {
  const session = await requireRole("contestant");
  const c = await getContestantByUserId(session.sub);
  if (!c) throw new ApiError(404, "No contestant profile");
  if (c.withdrawn_at) {
    // Idempotent — already withdrawn.
    return ok({ withdrawn: true, alreadyWithdrawn: true });
  }
  await withdrawContestant(c.id);
  clearSessionCookie();
  return ok({ withdrawn: true, alreadyWithdrawn: false });
});
