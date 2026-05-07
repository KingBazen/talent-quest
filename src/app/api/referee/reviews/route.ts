import { ok, route } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { query } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Row {
  submission_id: string;
  contestant_id: string;
  title: string;
  category: string;
  status: string;
  city: string;
  stage_name: string | null;
  full_name: string;
  total: number;
  notes: string | null;
  public_notes: string | null;
  updated_at: string | null;
}

/**
 * Every submission this referee has ever scored, with their total + notes.
 * Returns the public-anonymised contestant name (stage name → initials) so
 * the page mirrors the public-DTO contract.
 */
export const GET = route(async () => {
  const session = await requireRole("referee", "admin");
  const rows = await query<Row>(
    `SELECT
        sc.submission_id,
        s.contestant_id,
        s.title,
        s.category,
        s.status,
        c.city,
        c.stage_name,
        u.full_name,
        SUM(sc.points)::int AS total,
        sn.notes        AS notes,
        sn.public_notes AS public_notes,
        sn.updated_at   AS updated_at
       FROM scores sc
       JOIN submissions s ON s.id = sc.submission_id
       JOIN contestants c ON c.id = s.contestant_id
       JOIN users u       ON u.id = c.user_id
       LEFT JOIN score_notes sn
              ON sn.submission_id   = sc.submission_id
             AND sn.referee_user_id = sc.referee_user_id
      WHERE sc.referee_user_id = ?
      GROUP BY sc.submission_id, s.contestant_id, s.title, s.category, s.status,
               c.city, c.stage_name, u.full_name, sn.notes, sn.public_notes, sn.updated_at
      ORDER BY MAX(sc.created_at) DESC
      LIMIT 200`,
    [session.sub]
  );

  function initials(name: string): string {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "—";
    return (
      parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join(".") + "."
    );
  }

  return ok({
    items: rows.map((r) => ({
      submissionId: r.submission_id,
      contestantId: r.contestant_id,
      title: r.title,
      category: r.category,
      status: r.status,
      city: r.city,
      contestant: r.stage_name || initials(r.full_name),
      total: r.total,
      notes: r.notes,
      publicNotes: r.public_notes,
      updatedAt: r.updated_at,
    })),
  });
});
