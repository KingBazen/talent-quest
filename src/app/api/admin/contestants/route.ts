import { ok, route } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { listContestants } from "@/lib/contestants";
import { query, queryOne } from "@/lib/db";
import { aggregateScoresFor } from "@/lib/scores";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (req: Request) => {
  await requireRole("admin");
  const url = new URL(req.url);
  const search = url.searchParams.get("q") || undefined;
  const category = url.searchParams.get("category") || undefined;
  const status = url.searchParams.get("status") || undefined;
  const limit = Math.min(200, Number(url.searchParams.get("limit") || "100"));
  const offset = Math.max(0, Number(url.searchParams.get("offset") || "0"));

  const rows = await listContestants({
    search,
    category,
    status,
    limit,
    offset,
  });

  // Hydrate user names + emails in one batched query.
  const userMap = new Map<
    string,
    { id: string; full_name: string; email: string }
  >();
  if (rows.length) {
    const placeholders = rows.map(() => "?").join(",");
    const users = await query<{
      id: string;
      full_name: string;
      email: string;
    }>(
      `SELECT u.id, u.full_name, u.email
       FROM users u JOIN contestants c ON c.user_id = u.id
       WHERE c.id IN (${placeholders})`,
      rows.map((r) => r.id)
    );
    for (const u of users) userMap.set(u.id, u);
  }

  // For each contestant, get their latest submission's aggregated score in
  // parallel — keeps the request snappy even for the full 200-row page.
  const items = await Promise.all(
    rows.map(async (r) => {
      const u = userMap.get(r.user_id);
      const sub = await queryOne<{ id: string }>(
        `SELECT id FROM submissions WHERE contestant_id = ?
         ORDER BY created_at DESC LIMIT 1`,
        [r.id]
      );
      const agg = sub ? await aggregateScoresFor(sub.id) : null;
      return {
        id: r.id,
        fullName: u?.full_name ?? "—",
        email: u?.email ?? "—",
        city: r.city,
        category: r.category,
        status: r.status,
        score: agg && agg.judgesCount > 0 ? agg.total : null,
        createdAt: r.created_at,
      };
    })
  );

  return ok({ items, count: items.length });
});
