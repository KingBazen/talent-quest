import { ok, route } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { query } from "@/lib/db";
import { listMyScoredSubmissionIds } from "@/lib/scores";
import { JUDGING_CRITERIA } from "@/data/judging";
import type { SubmissionRow } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const session = await requireRole("referee", "admin");
  const reviewed = new Set(await listMyScoredSubmissionIds(session.sub));

  const submissions = await query<
    SubmissionRow & { city: string; c_cat: string; full_name: string }
  >(
    `SELECT s.*, c.city, c.category AS c_cat, u.full_name
     FROM submissions s
     JOIN contestants c ON c.id = s.contestant_id
     JOIN users u       ON u.id = c.user_id
     WHERE s.status IN ('pending','approved')
     ORDER BY s.created_at DESC
     LIMIT 50`
  );

  const items = submissions.map((s) => ({
    id: s.id,
    contestantId: s.contestant_id,
    title: s.title,
    contestant: s.full_name,
    city: s.city,
    category: s.category,
    thumbnail: s.thumbnail_url,
    videoUrl: s.video_url,
    durationSec: s.duration_sec,
    reviewedByMe: reviewed.has(s.id),
  }));

  return ok({ items, criteria: JUDGING_CRITERIA });
});
