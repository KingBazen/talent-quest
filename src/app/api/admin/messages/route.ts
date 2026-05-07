import { ok, route } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { query, queryOne, type ContactMessageRow } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin contact-message inbox. Filters: handled (yes/no/all), search.
 */
export const GET = route(async (req: Request) => {
  await requireRole("admin");
  const url = new URL(req.url);
  const handled = url.searchParams.get("handled");
  const search = url.searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(200, Number(url.searchParams.get("limit") || "100"));
  const offset = Math.max(0, Number(url.searchParams.get("offset") || "0"));

  const where: string[] = [];
  const params: unknown[] = [];
  if (handled === "0") {
    where.push("handled = 0");
  } else if (handled === "1") {
    where.push("handled = 1");
  }
  if (search) {
    where.push("(name ILIKE ? OR email ILIKE ? OR message ILIKE ?)");
    const q = `%${search}%`;
    params.push(q, q, q);
  }
  const w = where.length ? "WHERE " + where.join(" AND ") : "";

  const totalRow = await queryOne<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM contact_messages ${w}`,
    params
  );
  const items = await query<ContactMessageRow>(
    `SELECT * FROM contact_messages ${w} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  return ok({ items, total: totalRow?.n ?? 0 });
});
