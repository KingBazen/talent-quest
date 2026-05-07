import { z } from "zod";
import { ok, parseJson, route } from "@/lib/api";
import { ApiError, requireRole } from "@/lib/auth";
import { exec, query, queryOne } from "@/lib/db";
import { recordAudit } from "@/lib/audit-logs";
import {
  notifyFollowersOfStatusChange,
  notifyStatusChange,
} from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Bulk round publication. Accepts a list of contestant IDs + a target status
 * + a reason. Updates each row in a single transaction-style loop and writes
 * one audit_log row per contestant for traceable mass moves.
 */
const Body = z.object({
  contestantIds: z.array(z.string().regex(/^\d{6}$/)).min(1).max(500),
  status: z.enum(["shortlisted", "advanced", "eliminated"]),
  reason: z.string().min(4).max(500),
});

export const POST = route(async (req: Request) => {
  const session = await requireRole("admin");
  const data = await parseJson(req, Body);

  // Look up current statuses + user_id up-front so the audit log captures real
  // before-values (rather than re-fetching after each UPDATE), and so the
  // P7-T008 notify step has a user_id without a second round-trip per row.
  const placeholders = data.contestantIds.map(() => "?").join(",");
  const rows = await query<{
    id: string;
    status: string;
    user_id: string;
    stage_name: string | null;
  }>(
    `SELECT id, status, user_id, stage_name FROM contestants WHERE id IN (${placeholders})`,
    data.contestantIds
  );
  const beforeMap = new Map(
    rows.map((r) => [
      r.id,
      { status: r.status, userId: r.user_id, stageName: r.stage_name },
    ])
  );

  let updated = 0;
  const skipped: { id: string; reason: string }[] = [];
  for (const id of data.contestantIds) {
    const before = beforeMap.get(id);
    if (!before) {
      skipped.push({ id, reason: "not found" });
      continue;
    }
    if (before.status === "eliminated") {
      // Don't silently un-eliminate via bulk publish.
      skipped.push({ id, reason: "already eliminated" });
      continue;
    }
    if (before.status === data.status) {
      // No-op — still count as a "no change" but no audit log noise.
      continue;
    }
    await exec(`UPDATE contestants SET status = ? WHERE id = ?`, [
      data.status,
      id,
    ]);
    await recordAudit({
      actorUserId: session.sub,
      targetType: "contestant",
      targetId: id,
      action: "round.publish",
      reason: data.reason,
      payload: { status_before: before.status, status_after: data.status },
    });
    try {
      await notifyStatusChange({
        userId: before.userId,
        status: data.status,
        reason: data.reason,
      });
      // P8-T006: in-app fan-out to followers of this contestant.
      await notifyFollowersOfStatusChange({
        contestantId: id,
        contestantDisplay: before.stageName || id,
        status: data.status,
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn(
        JSON.stringify({
          level: "warn",
          evt: "results.publish.notify_failed",
          contestant_id: id,
          error: e instanceof Error ? e.message : "unknown",
        })
      );
    }
    updated += 1;
  }

  return ok({ updated, skipped, total: data.contestantIds.length });
});

/** Helper for the page UI: counts per current status, plus a list of
 *  contestants in a given status so the admin can pick from a focused set. */
export const GET = route(async (req: Request) => {
  await requireRole("admin");
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "submitted";

  const counts = await query<{ status: string; n: number }>(
    `SELECT status, COUNT(*)::int AS n FROM contestants GROUP BY status`
  );
  const list = await query<{
    id: string;
    full_name: string;
    city: string;
    category: string;
    score_total: number | null;
    judges: number;
  }>(
    `SELECT
        c.id,
        u.full_name,
        c.city,
        c.category,
        sub_total.total       AS score_total,
        COALESCE(sub_total.judges, 0)::int AS judges
       FROM contestants c
       JOIN users u ON u.id = c.user_id
       LEFT JOIN LATERAL (
         SELECT
           SUM(points)::int                    AS total,
           COUNT(DISTINCT referee_user_id)::int AS judges
         FROM scores sc
         JOIN submissions s ON s.id = sc.submission_id
         WHERE s.contestant_id = c.id
       ) sub_total ON true
      WHERE c.status = ?
      ORDER BY COALESCE(sub_total.total, 0) DESC, c.created_at ASC
      LIMIT 500`,
    [status]
  );
  const totalRow = await queryOne<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM contestants WHERE status = ?`,
    [status]
  );
  return ok({
    counts: Object.fromEntries(counts.map((c) => [c.status, c.n])),
    list: list.map((r) => ({
      id: r.id,
      fullName: r.full_name,
      city: r.city,
      category: r.category,
      scoreTotal: r.score_total,
      judges: r.judges,
    })),
    total: totalRow?.n ?? 0,
  });
});
