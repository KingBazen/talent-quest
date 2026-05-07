import { z } from "zod";
import { ok, parseJson, route } from "@/lib/api";
import { ApiError, requireRole } from "@/lib/auth";
import {
  assignReferees,
  listAssignmentsForSubmission,
  unassignReferee,
} from "@/lib/assignments";
import { getContestantById, getSubmissionById } from "@/lib/contestants";
import { queryOne } from "@/lib/db";
import { recordAudit } from "@/lib/audit-logs";
import { notifyRefereeAssignment } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin-only assignment management for the referee queue.
 *
 *   • POST   { submissionId, refereeUserIds[] }  → upsert assignments
 *   • DELETE ?submissionId&refereeUserId         → remove a single assignment
 *   • GET    ?submissionId                       → list assignees + names
 */

export const GET = route(async (req: Request) => {
  await requireRole("admin");
  const url = new URL(req.url);
  const submissionId = url.searchParams.get("submissionId");
  if (!submissionId) throw new ApiError(400, "submissionId is required");
  const rows = await listAssignmentsForSubmission(submissionId);
  return ok({ submissionId, assignments: rows });
});

const PostBody = z.object({
  submissionId: z.string().min(3),
  refereeUserIds: z.array(z.string().min(3)).min(1).max(20),
});

export const POST = route(async (req: Request) => {
  const session = await requireRole("admin");
  const data = await parseJson(req, PostBody);

  const submission = await getSubmissionById(data.submissionId);
  if (!submission) throw new ApiError(404, "Submission not found");

  // Validate that every supplied user id is actually a referee/admin.
  for (const id of data.refereeUserIds) {
    const u = await queryOne<{ role: string }>(
      `SELECT role FROM users WHERE id = ?`,
      [id]
    );
    if (!u) throw new ApiError(404, `User ${id} not found`);
    if (u.role !== "referee" && u.role !== "admin") {
      throw new ApiError(
        409,
        `User ${id} has role "${u.role}" — only referees / admins can be assigned`
      );
    }
  }

  const result = await assignReferees({
    submissionId: data.submissionId,
    refereeUserIds: data.refereeUserIds,
    assignedByUserId: session.sub,
  });

  // Look up the contestant once for the per-assignment notification copy.
  // Stage-name fallback to initials matches the public DTO contract — we do
  // NOT leak the full name into the referee email body.
  const contestant = await getContestantById(submission.contestant_id);
  const stageName =
    contestant?.stage_name ||
    `Contestant ${submission.contestant_id.slice(-6)}`;

  for (const refereeUserId of data.refereeUserIds) {
    await recordAudit({
      actorUserId: session.sub,
      targetType: "assignment",
      targetId: `${data.submissionId}:${refereeUserId}`,
      action: "assignment.create",
      payload: {
        submission_id: data.submissionId,
        referee_user_id: refereeUserId,
        contestant_id: submission.contestant_id,
      },
    });
    // P7-T010: notify the assigned referee (email + in-app inbox). Wrapped so
    // an email failure can't block the audit-logged DB change.
    try {
      await notifyRefereeAssignment({
        refereeUserId,
        contestantStageName: stageName,
        category: submission.category,
        submissionId: data.submissionId,
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn(
        JSON.stringify({
          level: "warn",
          evt: "assignments.create.notify_failed",
          referee_user_id: refereeUserId,
          submission_id: data.submissionId,
          error: e instanceof Error ? e.message : "unknown",
        })
      );
    }
  }

  return ok(result);
});

export const DELETE = route(async (req: Request) => {
  const session = await requireRole("admin");
  const url = new URL(req.url);
  const submissionId = url.searchParams.get("submissionId");
  const refereeUserId = url.searchParams.get("refereeUserId");
  if (!submissionId || !refereeUserId)
    throw new ApiError(400, "submissionId and refereeUserId are required");

  await unassignReferee(submissionId, refereeUserId);
  await recordAudit({
    actorUserId: session.sub,
    targetType: "assignment",
    targetId: `${submissionId}:${refereeUserId}`,
    action: "assignment.delete",
    payload: { submission_id: submissionId, referee_user_id: refereeUserId },
  });
  return ok({ ok: true });
});
