import { z } from "zod";
import { ok, parseJson, route } from "@/lib/api";
import { ApiError, requireRole } from "@/lib/auth";
import { getContestantById } from "@/lib/contestants";
import { exec } from "@/lib/db";
import { recordAudit } from "@/lib/audit-logs";
import {
  notifyFollowersOfStatusChange,
  notifyStatusChange,
} from "@/lib/notify";
import { queryOne } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Admin status mutation for contestants. Used to:
 *   • Manually shortlist or eliminate after a referee panel decision.
 *   • Move a contestant back to `submitted` after a mistake.
 *   • Eliminate at the end of a round.
 *
 * Every mutation requires a non-trivial reason (≥ 4 chars) and lands in
 * audit_logs with the actor user id, the before/after status, and the reason.
 */

const TERMINAL = ["eliminated"] as const;

const Body = z.object({
  status: z.enum([
    "registered",
    "submitted",
    "shortlisted",
    "advanced",
    "eliminated",
  ]),
  reason: z.string().min(4, "Reason is required for any status change").max(500),
});

export const PATCH = route(async (req, ctx: { params: { id: string } }) => {
  const session = await requireRole("admin");
  const id = ctx.params.id;
  const data = await parseJson(req, Body);

  const before = await getContestantById(id);
  if (!before) throw new ApiError(404, "Contestant not found");

  // Disallow re-entering the pipeline once eliminated. Kept conservative —
  // the audit log shows the historical decision; if a real reversal is needed
  // it goes through a super-admin path (Phase 14).
  if (
    (TERMINAL as readonly string[]).includes(before.status) &&
    data.status !== before.status
  ) {
    throw new ApiError(
      409,
      `Contestant is "${before.status}" (terminal). Reach out to super-admin for reversals.`
    );
  }

  await exec(`UPDATE contestants SET status = ? WHERE id = ?`, [
    data.status,
    id,
  ]);

  await recordAudit({
    actorUserId: session.sub,
    targetType: "contestant",
    targetId: id,
    action: "contestant.status_change",
    reason: data.reason,
    payload: {
      status_before: before.status,
      status_after: data.status,
    },
  });

  // P7-T008 + P8-T006: notify the contestant out-of-band, plus their
  // followers' in-app inboxes. Email + in-app for the contestant; in-app
  // only for followers (avoid mass mail). Wrapped in try/catch — a downstream
  // email failure must not roll back the audit-logged DB change.
  try {
    await notifyStatusChange({
      userId: before.user_id,
      status: data.status,
      reason: data.reason,
    });
    const userRow = await queryOne<{ full_name: string }>(
      `SELECT full_name FROM users WHERE id = ?`,
      [before.user_id]
    );
    const display =
      before.stage_name ||
      (userRow?.full_name ?? "")
        .split(" ")
        .slice(0, 2)
        .join(" ");
    await notifyFollowersOfStatusChange({
      contestantId: id,
      contestantDisplay: display,
      status: data.status,
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn(
      JSON.stringify({
        level: "warn",
        evt: "admin.status_change.notify_failed",
        contestant_id: id,
        error: e instanceof Error ? e.message : "unknown",
      })
    );
  }

  return ok({
    statusBefore: before.status,
    statusAfter: data.status,
  });
});
