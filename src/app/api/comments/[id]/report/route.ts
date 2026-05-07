import { z } from "zod";
import { ok, parseJson, route } from "@/lib/api";
import { ApiError, readSession } from "@/lib/auth";
import {
  getCommentById,
  incrementCommentFlag,
  recordModerationAction,
} from "@/lib/engagement";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * Phase 8 (P8-T009): user-driven comment report.
 *
 * Any signed-in user can flag a comment they think is abusive. The flag
 * count on the comment row is bumped (cheap counter) AND a moderation_action
 * row is written (audit trail of who reported what).
 *
 * Rate-limited 10/hour/user — frequent reporters can still flag a thread,
 * but a single user can't tank the moderation queue.
 */

const Body = z.object({
  reason: z.string().min(0).max(500).optional(),
});

export const POST = route(async (req, ctx: { params: { id: string } }) => {
  const session = await readSession();
  if (!session) throw new ApiError(401, "Sign in to report a comment");

  const comment = await getCommentById(ctx.params.id);
  if (!comment) throw new ApiError(404, "Comment not found");

  await enforceRateLimit({
    bucket: "comment.report",
    identifier: session.sub,
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });

  const { reason } = await parseJson(req, Body);

  await incrementCommentFlag(ctx.params.id);
  await recordModerationAction({
    targetType: "comment",
    targetId: ctx.params.id,
    action: "report",
    actorUserId: session.sub,
    reason: reason ?? null,
  });

  return ok({ reported: true });
});
