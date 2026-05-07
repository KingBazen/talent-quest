import { ok, route } from "@/lib/api";
import { ApiError, getUserById, readSession } from "@/lib/auth";
import { getContestantById } from "@/lib/contestants";
import { toggleFollow } from "@/lib/engagement";
import { notifyContestantOfFollow } from "@/lib/notify";

export const runtime = "nodejs";

export const POST = route(async (_req, ctx: { params: { id: string } }) => {
  const session = await readSession();
  if (!session) throw new ApiError(401, "Sign in to follow");
  const c = await getContestantById(ctx.params.id);
  if (!c || c.withdrawn_at) throw new ApiError(404, "Contestant not found");
  const r = await toggleFollow(session.sub, ctx.params.id);

  // Notify the contestant on a *new* follow (toggle-on), not on unfollow.
  if (r.following) {
    try {
      const follower = await getUserById(session.sub);
      const display = follower
        ? follower.full_name.split(" ").slice(0, 2).join(" ")
        : "Someone";
      await notifyContestantOfFollow({
        contestantUserId: c.user_id,
        followerDisplay: display,
        contestantId: c.id,
      });
    } catch {
      // best-effort; don't break the follow on a notify failure
    }
  }

  return ok(r);
});
