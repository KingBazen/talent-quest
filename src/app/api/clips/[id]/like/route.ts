import { ok, route } from "@/lib/api";
import { ApiError, readSession } from "@/lib/auth";
import { getClipById, toggleClipLike } from "@/lib/media-clips";

export const runtime = "nodejs";

export const POST = route(async (_req, ctx: { params: { id: string } }) => {
  const session = await readSession();
  if (!session) throw new ApiError(401, "Sign in to like a clip");
  const clip = await getClipById(ctx.params.id);
  if (!clip || clip.status !== "published") {
    throw new ApiError(404, "Clip not found");
  }
  const r = await toggleClipLike(session.sub, ctx.params.id);
  return ok(r);
});
