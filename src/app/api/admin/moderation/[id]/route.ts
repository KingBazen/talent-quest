import { z } from "zod";
import { ok, parseJson, route } from "@/lib/api";
import { ApiError, requireRole } from "@/lib/auth";
import {
  getCommentById,
  recordModerationAction,
  setCommentStatus,
} from "@/lib/engagement";
import { recordAudit } from "@/lib/audit-logs";

export const runtime = "nodejs";

/**
 * Phase 8 (P8-T008): admin moderation actions on a comment.
 *
 * PATCH { action: "hide" | "unhide" | "remove", reason: string }
 *
 *   - hide   → status = 'hidden'   (visible only to author + admins)
 *   - unhide → status = 'visible'  (restore after a false report)
 *   - remove → status = 'removed'  (gone from every read path)
 *
 * Every action lands in audit_logs (admin accountability) and in
 * moderation_actions (moderation timeline for the target).
 */

const Body = z.object({
  action: z.enum(["hide", "unhide", "remove"]),
  reason: z.string().min(4, "Reason is required").max(500),
});

export const PATCH = route(async (req, ctx: { params: { id: string } }) => {
  const session = await requireRole("admin");
  const id = ctx.params.id;

  const before = await getCommentById(id);
  if (!before) throw new ApiError(404, "Comment not found");

  const { action, reason } = await parseJson(req, Body);

  const nextStatus =
    action === "hide" ? "hidden" : action === "remove" ? "removed" : "visible";

  await setCommentStatus(id, nextStatus);

  await recordModerationAction({
    targetType: "comment",
    targetId: id,
    action,
    actorUserId: session.sub,
    reason,
  });

  await recordAudit({
    actorUserId: session.sub,
    targetType: "comment",
    targetId: id,
    action: `comment.${action}`,
    reason,
    payload: { status_before: before.status, status_after: nextStatus },
  });

  return ok({ statusBefore: before.status, statusAfter: nextStatus });
});
