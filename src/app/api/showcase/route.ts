import { ok, route } from "@/lib/api";
import { query } from "@/lib/db";
import type { SubmissionRow } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Returns only real approved submissions — no static / demo backfill. If the
 * roster is empty the page renders a clear empty state. We never invent
 * synthetic clips: trust matters more than a busy-looking showcase.
 *
 * Each row uses the contestant's stage name (or initials, never their full
 * name) for display, mirroring the public-DTO anonymisation in
 * src/lib/dto.ts.
 */

function initialsFromName(fullName: string): string {
  const parts = fullName.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join(".") + ".";
}

export const GET = route(async () => {
  const approved = await query<
    SubmissionRow & {
      full_name: string;
      city: string;
      stage_name: string | null;
    }
  >(
    `SELECT s.*, u.full_name, c.city, c.stage_name
     FROM submissions s
     JOIN contestants c ON c.id = s.contestant_id
     JOIN users u       ON u.id = c.user_id
     WHERE s.status = 'approved'
     ORDER BY s.created_at DESC
     LIMIT 24`
  );

  const items = approved.map((s) => ({
    id: s.id,
    title: s.title,
    contestant: s.stage_name || initialsFromName(s.full_name),
    category: s.category,
    city: s.city,
    thumbnail:
      s.thumbnail_url ||
      "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=800&q=80",
    videoUrl: s.video_url ?? undefined,
    durationSec: s.duration_sec ?? 60,
  }));

  return ok({ items });
});
