import { z } from "zod";
import { ok, parseJson, route } from "@/lib/api";
import { ApiError, requireRole } from "@/lib/auth";
import { refereeCanAccess } from "@/lib/assignments";
import {
  getSubmissionById,
  setSubmissionStatus,
} from "@/lib/contestants";
import { recordAudit } from "@/lib/audit-logs";

export const runtime = "nodejs";

/**
 * Referee / admin can flip a submission to one of four review states.
 *
 *   • approved — visible in /showcase, eligible for round progression
 *   • rejected — removed from referee queues + showcase; final decision
 *   • flagged  — held for admin review (e.g. inappropriate content)
 *   • pending  — restore from a flag/reject mistake
 *
 * `superseded` is intentionally NOT settable here — it's owned by the
 * replace-submission flow and shouldn't be reachable from review tools.
 *
 * Referees can only mutate submissions assigned to them. Admins can mutate
 * any submission.
 */
const Body = z.object({
  status: z.enum(["pending", "approved", "rejected", "flagged"]),
  reason: z.string().min(0).max(500).optional(),
});

export const PATCH = route(async (req, ctx: { params: { id: string } }) => {
  const session = await requireRole("referee", "admin");
  const id = ctx.params.id;

  const submission = await getSubmissionById(id);
  if (!submission) throw new ApiError(404, "Submission not found");

  if (session.role === "referee") {
    const allowed = await refereeCanAccess(id, session.sub);
    if (!allowed) throw new ApiError(403, "Submission not assigned to you");
  }

  const { status, reason } = await parseJson(req, Body);
  await setSubmissionStatus(id, status);
  await recordAudit({
    actorUserId: session.sub,
    targetType: "submission",
    targetId: id,
    action: "submission.status_change",
    reason: reason ?? null,
    payload: {
      status_before: submission.status,
      status_after: status,
      role: session.role,
    },
  });
  return ok({ ok: true, statusBefore: submission.status, statusAfter: status });
});
