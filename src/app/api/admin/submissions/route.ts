import { ok, route } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { aggregateScoresFor } from "@/lib/scores";
import type { SubmissionRow } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_STATUS = [
  "pending",
  "approved",
  "rejected",
  "flagged",
  "superseded",
] as const;

/**
 * Admin-side cross-cutting submissions list. Filterable by status / category /
 * search (title or contestant ID). Includes the aggregated score per
 * submission so the table is useful without per-row drill-down.
 */
export const GET = route(async (req: Request) => {
  await requireRole("admin");
  const url = new URL(req.url);
  const statusParam = url.searchParams.get("status") ?? "";
  const status = (ALLOWED_STATUS as readonly string[]).includes(statusParam)
    ? (statusParam as (typeof ALLOWED_STATUS)[number])
    : undefined;
  const category = url.searchParams.get("category") ?? undefined;
  const search = url.searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(200, Number(url.searchParams.get("limit") || "100"));
  const offset = Math.max(0, Number(url.searchParams.get("offset") || "0"));

  const where: string[] = [];
  const params: unknown[] = [];
  if (status) {
    where.push("s.status = ?");
    params.push(status);
  }
  if (category) {
    where.push("s.category = ?");
    params.push(category);
  }
  if (search) {
    where.push("(s.title ILIKE ? OR s.contestant_id ILIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }
  const w = where.length ? "WHERE " + where.join(" AND ") : "";

  const totalRow = await queryOne<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM submissions s ${w}`,
    params
  );
  const rows = await query<
    SubmissionRow & { stage_name: string | null; full_name: string; city: string }
  >(
    `SELECT s.*, c.stage_name, c.city, u.full_name
       FROM submissions s
       JOIN contestants c ON c.id = s.contestant_id
       JOIN users u       ON u.id = c.user_id
      ${w}
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  function initials(name: string): string {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "—";
    return (
      parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join(".") + "."
    );
  }

  const items = await Promise.all(
    rows.map(async (s) => {
      const agg = await aggregateScoresFor(s.id);
      return {
        id: s.id,
        contestantId: s.contestant_id,
        title: s.title,
        contestant: s.stage_name || initials(s.full_name),
        city: s.city,
        category: s.category,
        status: s.status,
        thumbnail: s.thumbnail_url,
        videoUrl: s.video_url,
        durationSec: s.duration_sec,
        createdAt: s.created_at,
        score: agg.judgesCount > 0 ? { total: agg.total, judges: agg.judgesCount } : null,
      };
    })
  );

  return ok({ items, total: totalRow?.n ?? 0 });
});
