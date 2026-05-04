import { ok, route } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { avgScoreOverall } from "@/lib/scores";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async () => {
  await requireRole("admin");

  const [contestantsRow, weekRow, subsRow, reviewedRow, payments, byCategory, avg] =
    await Promise.all([
      queryOne<{ n: number }>(`SELECT COUNT(*)::int AS n FROM contestants`),
      queryOne<{ n: number }>(
        `SELECT COUNT(*)::int AS n FROM contestants
         WHERE created_at::timestamp >= NOW() - INTERVAL '7 days'`
      ),
      queryOne<{ n: number }>(`SELECT COUNT(*)::int AS n FROM submissions`),
      queryOne<{ n: number }>(
        `SELECT COUNT(DISTINCT submission_id)::int AS n FROM scores`
      ),
      queryOne<{
        gross: number | null;
        paid: number;
        pending: number;
      }>(
        `SELECT
           COALESCE(SUM(CASE WHEN status='succeeded' THEN amount_cents ELSE 0 END), 0)::int AS gross,
           COALESCE(SUM(CASE WHEN status='succeeded' THEN 1 ELSE 0 END), 0)::int             AS paid,
           COALESCE(SUM(CASE WHEN status='pending'   THEN 1 ELSE 0 END), 0)::int             AS pending
         FROM payments`
      ),
      query<{ category: string; n: number }>(
        `SELECT category, COUNT(*)::int AS n FROM contestants GROUP BY category`
      ),
      avgScoreOverall(),
    ]);

  const totalForCategoryPct = byCategory.reduce((s, r) => s + r.n, 0) || 1;

  return ok({
    contestants: {
      total: contestantsRow?.n ?? 0,
      weeklyDelta: weekRow?.n ?? 0,
    },
    submissions: {
      total: subsRow?.n ?? 0,
      reviewed: reviewedRow?.n ?? 0,
    },
    avgScore: avg,
    payments: {
      grossCents: payments?.gross ?? 0,
      paid: payments?.paid ?? 0,
      pending: payments?.pending ?? 0,
    },
    categoryDistribution: byCategory.map((r) => ({
      category: r.category,
      count: r.n,
      pct: Math.round((r.n / totalForCategoryPct) * 100),
    })),
  });
});
