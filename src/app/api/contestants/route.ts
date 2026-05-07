import { ok, route } from "@/lib/api";
import { query } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Phase 8 (P8-T003): public contestant directory.
 *
 * Lists every contestant who has at least one APPROVED submission. Safe-by-
 * default DTO: stage name (or initials), city, category, like + follow
 * counts. Never returns full name, email, phone, DOB.
 *
 * Query params:
 *   ?category=rap|singing|...   filter by category
 *   ?city=...                   case-insensitive contains
 *   ?q=...                      search stage name (or initials)
 *   ?limit=...                  cap result size, default 60, max 200
 */

interface DirectoryRow {
  id: string;
  full_name: string;
  stage_name: string | null;
  city: string;
  category: string;
  status: string;
  likes: number;
  followers: number;
}

export const GET = route(async (req: Request) => {
  const url = new URL(req.url);
  const category = url.searchParams.get("category") || "";
  const city = url.searchParams.get("city") || "";
  const q = url.searchParams.get("q") || "";
  const limit = Math.min(
    Math.max(Number(url.searchParams.get("limit") ?? 60), 1),
    200
  );

  const filters: string[] = [
    `c.withdrawn_at IS NULL`,
    `EXISTS (
       SELECT 1 FROM submissions s
        WHERE s.contestant_id = c.id AND s.status = 'approved'
     )`,
  ];
  const params: unknown[] = [];
  if (category) {
    filters.push(`c.category = ?`);
    params.push(category);
  }
  if (city) {
    filters.push(`c.city ILIKE ?`);
    params.push(`%${city}%`);
  }
  if (q) {
    filters.push(`(c.stage_name ILIKE ? OR u.full_name ILIKE ?)`);
    params.push(`%${q}%`, `%${q}%`);
  }

  const rows = await query<DirectoryRow>(
    `SELECT
        c.id,
        u.full_name,
        c.stage_name,
        c.city,
        c.category,
        c.status,
        COALESCE(l.n, 0)::int AS likes,
        COALESCE(f.n, 0)::int AS followers
       FROM contestants c
       JOIN users u ON u.id = c.user_id
       LEFT JOIN (
         SELECT contestant_id, COUNT(*)::int AS n
           FROM engagement_likes
          GROUP BY contestant_id
       ) l ON l.contestant_id = c.id
       LEFT JOIN (
         SELECT contestant_id, COUNT(*)::int AS n
           FROM engagement_follows
          GROUP BY contestant_id
       ) f ON f.contestant_id = c.id
      WHERE ${filters.join(" AND ")}
      ORDER BY likes DESC, followers DESC, c.created_at DESC
      LIMIT ${limit}`,
    params
  );

  // Project to a public-safe shape — never expose full_name to anonymous
  // viewers; fall back to initials if no stage_name set.
  const items = rows.map((r) => ({
    id: r.id,
    displayName:
      r.stage_name ||
      r.full_name
        .split(" ")
        .map((p) => p[0]?.toUpperCase())
        .filter(Boolean)
        .slice(0, 2)
        .join(".") + ".",
    city: r.city,
    category: r.category,
    status: r.status,
    likes: r.likes,
    followers: r.followers,
  }));

  return ok({ items, total: items.length });
});
