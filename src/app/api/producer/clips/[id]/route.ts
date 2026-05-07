import { z } from "zod";
import { ok, parseJson, route } from "@/lib/api";
import { ApiError, requireRole } from "@/lib/auth";
import { getClipById, setClipStatus } from "@/lib/media-clips";
import { recordAudit } from "@/lib/audit-logs";

export const runtime = "nodejs";

/**
 * Phase 11: producer can transition a clip's status.
 *
 *   PATCH { status: "draft" | "published" | "archived" }
 *
 * Audit-logged. Idempotent (no-op if status is already what was asked for).
 */

const Body = z.object({
  status: z.enum(["draft", "published", "archived"]),
});

export const PATCH = route(async (req, ctx: { params: { id: string } }) => {
  const session = await requireRole("producer", "admin");
  const before = await getClipById(ctx.params.id);
  if (!before) throw new ApiError(404, "Clip not found");

  const { status } = await parseJson(req, Body);
  if (before.status === status) {
    return ok({ status });
  }
  await setClipStatus(ctx.params.id, status);
  await recordAudit({
    actorUserId: session.sub,
    targetType: "submission",
    targetId: ctx.params.id,
    action: `clip.${status}`,
    payload: { status_before: before.status, status_after: status },
  });
  return ok({ status });
});
