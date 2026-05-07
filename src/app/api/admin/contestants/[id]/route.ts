import { ok, route } from "@/lib/api";
import { ApiError, requireRole } from "@/lib/auth";
import { getContestantById, listProgress } from "@/lib/contestants";
import { contestantToDTO } from "@/lib/dto";
import { query, queryOne } from "@/lib/db";
import { aggregateScoresFor } from "@/lib/scores";
import { listAudits } from "@/lib/audit-logs";
import type { PaymentRow, SubmissionRow, UserRow } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin contestant detail. Returns the private DTO + every submission +
 * aggregate score per submission + payments + recent audit-log rows
 * targeted at this contestant. Used by `/admin/contestants/[id]`.
 */
export const GET = route(async (_req, ctx: { params: { id: string } }) => {
  await requireRole("admin");
  const id = ctx.params.id;

  const contestant = await getContestantById(id);
  if (!contestant) throw new ApiError(404, "Contestant not found");

  const user = await queryOne<UserRow>("SELECT * FROM users WHERE id = ?", [
    contestant.user_id,
  ]);
  if (!user) throw new ApiError(500, "User row missing for contestant");

  const progress = await listProgress(contestant.id);
  const submissions = await query<SubmissionRow>(
    "SELECT * FROM submissions WHERE contestant_id = ? ORDER BY created_at DESC",
    [contestant.id]
  );
  const submissionsWithScore = await Promise.all(
    submissions.map(async (s) => {
      const agg = await aggregateScoresFor(s.id);
      return {
        id: s.id,
        title: s.title,
        category: s.category,
        status: s.status,
        videoUrl: s.video_url,
        thumbnailUrl: s.thumbnail_url,
        durationSec: s.duration_sec,
        format: s.format,
        sizeBytes: s.size_bytes,
        width: s.width,
        height: s.height,
        supersedesId: s.supersedes_id,
        supersededAt: s.superseded_at,
        notes: s.notes,
        createdAt: s.created_at,
        score: agg.judgesCount > 0 ? { total: agg.total, judges: agg.judgesCount } : null,
      };
    })
  );

  const payments = await query<PaymentRow>(
    "SELECT * FROM payments WHERE contestant_id = ? ORDER BY created_at DESC",
    [contestant.id]
  );

  const audits = await listAudits({
    targetType: "contestant",
    targetId: contestant.id,
    limit: 50,
  });

  return ok({
    contestant: contestantToDTO(contestant, user, progress),
    submissions: submissionsWithScore,
    payments: payments.map((p) => ({
      id: p.id,
      amountCents: p.amount_cents,
      currency: p.currency,
      provider: p.provider,
      providerRef: p.provider_ref,
      status: p.status,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    })),
    auditLog: audits.items.map((a) => ({
      id: a.id,
      action: a.action,
      actorUserId: a.actor_user_id,
      reason: a.reason,
      payload: a.payload,
      createdAt: a.created_at,
    })),
  });
});
