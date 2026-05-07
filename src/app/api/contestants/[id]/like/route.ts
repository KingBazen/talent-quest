import { ok, route } from "@/lib/api";
import { ApiError, readSession } from "@/lib/auth";
import { getContestantById } from "@/lib/contestants";
import { toggleLike } from "@/lib/engagement";

export const runtime = "nodejs";

export const POST = route(async (_req, ctx: { params: { id: string } }) => {
  const session = await readSession();
  if (!session) throw new ApiError(401, "Sign in to like");
  const c = await getContestantById(ctx.params.id);
  if (!c || c.withdrawn_at) throw new ApiError(404, "Contestant not found");
  const r = await toggleLike(session.sub, ctx.params.id);
  return ok(r);
});
