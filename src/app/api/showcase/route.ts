import { ok, route } from "@/lib/api";
import { query } from "@/lib/db";
import { SHOWCASE_CLIPS } from "@/data/showcase";
import type { SubmissionRow } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Returns approved submissions plus the static SHOWCASE_CLIPS gallery.
 * Real submissions take priority — once contestants start uploading,
 * the showcase becomes a live feed instead of demo media.
 */
export const GET = route(async () => {
  const approved = await query<
    SubmissionRow & { full_name: string; city: string }
  >(
    `SELECT s.*, u.full_name, c.city
     FROM submissions s
     JOIN contestants c ON c.id = s.contestant_id
     JOIN users u       ON u.id = c.user_id
     WHERE s.status = 'approved'
     ORDER BY s.created_at DESC
     LIMIT 24`
  );

  const live = approved.map((s) => ({
    id: s.id,
    title: s.title,
    contestant: s.full_name,
    category: s.category,
    city: s.city,
    thumbnail:
      s.thumbnail_url ||
      "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=800&q=80",
    videoUrl: s.video_url ?? undefined,
    durationSec: s.duration_sec ?? 60,
    views: 0,
    likes: 0,
  }));

  // Backfill with the curated static gallery to keep the showcase rich.
  const items = [...live, ...SHOWCASE_CLIPS];

  return ok({ items });
});
