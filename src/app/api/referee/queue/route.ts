import { ok, route } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { query } from "@/lib/db";
import { listMyScoredSubmissionIds } from "@/lib/scores";
import { JUDGING_CRITERIA } from "@/data/judging";
import type { SubmissionRow } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Phase 5 (P5-T002): assignment-aware queue.
 *
 * Returns the submissions assigned to the current user (referee or admin).
 * Admins additionally accept `?includeUnassigned=1` to surface the pool of
 * approved/pending submissions that no referee has been assigned to yet —
 * useful for the assignment UI in Phase 6 admin tooling.
 *
 * Filters out `superseded`, `rejected`, and `flagged` items. Earlier takes
 * stay scored against in `scores` for the audit trail but should never
 * appear in an active scoring queue.
 */
export const GET = route(async (req: Request) => {
  const session = await requireRole("referee", "admin");
  const url = new URL(req.url);
  const includeUnassigned =
    session.role === "admin" && url.searchParams.get("includeUnassigned") === "1";

  const reviewed = new Set(await listMyScoredSubmissionIds(session.sub));

  // Two passes to keep the query simple: assigned-to-me, then optionally
  // unassigned-pool. Both share the same projection.
  const PROJECTION = `s.*, c.city, c.category AS c_cat, u.full_name, c.stage_name`;
  const ACTIVE_STATUS_FILTER = `s.status IN ('pending','approved')`;

  const assigned = await query<
    SubmissionRow & {
      city: string;
      c_cat: string;
      full_name: string;
      stage_name: string | null;
    }
  >(
    `SELECT ${PROJECTION}
       FROM submission_assignments a
       JOIN submissions s ON s.id = a.submission_id
       JOIN contestants c ON c.id = s.contestant_id
       JOIN users u       ON u.id = c.user_id
      WHERE a.referee_user_id = ?
        AND ${ACTIVE_STATUS_FILTER}
      ORDER BY s.created_at DESC
      LIMIT 100`,
    [session.sub]
  );

  let unassigned: typeof assigned = [];
  if (includeUnassigned) {
    unassigned = await query<
      SubmissionRow & {
        city: string;
        c_cat: string;
        full_name: string;
        stage_name: string | null;
      }
    >(
      `SELECT ${PROJECTION}
         FROM submissions s
         JOIN contestants c ON c.id = s.contestant_id
         JOIN users u       ON u.id = c.user_id
        WHERE ${ACTIVE_STATUS_FILTER}
          AND NOT EXISTS (
            SELECT 1 FROM submission_assignments a WHERE a.submission_id = s.id
          )
        ORDER BY s.created_at DESC
        LIMIT 50`
    );
  }

  function shape(s: (typeof assigned)[number], assignedFlag: boolean) {
    return {
      id: s.id,
      contestantId: s.contestant_id,
      title: s.title,
      // Anonymised: stage name → initials fallback (never raw full name).
      contestant:
        s.stage_name ||
        (() => {
          const parts = s.full_name.split(/\s+/).filter(Boolean);
          return (
            parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join(".") +
            "."
          );
        })(),
      city: s.city,
      category: s.category,
      status: s.status,
      thumbnail: s.thumbnail_url,
      videoUrl: s.video_url,
      durationSec: s.duration_sec,
      reviewedByMe: reviewed.has(s.id),
      assignedToMe: assignedFlag,
    };
  }

  const items = [
    ...assigned.map((s) => shape(s, true)),
    ...unassigned.map((s) => shape(s, false)),
  ];

  return ok({
    items,
    criteria: JUDGING_CRITERIA,
    assignedCount: assigned.length,
    unassignedCount: unassigned.length,
  });
});
