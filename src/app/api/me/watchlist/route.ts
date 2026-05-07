import { ok, route } from "@/lib/api";
import { ApiError, readSession } from "@/lib/auth";
import { listWatchlist } from "@/lib/media-clips";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Phase 11 (P11-T007): the signed-in user's saved clips.
 *
 *   GET /api/me/watchlist → up to 200 saved-but-published clips, newest save first
 */

export const GET = route(async () => {
  const session = await readSession();
  if (!session) throw new ApiError(401, "Sign in");
  const items = await listWatchlist(session.sub);
  return ok({ items });
});
