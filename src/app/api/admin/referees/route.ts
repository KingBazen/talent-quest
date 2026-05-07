import { ok, route } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { query } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin-only roster of referee + admin users (those who can be assigned to
 * score a submission). Phase 6's `/admin/referees` page consumes this; the
 * minimal Phase 5 admin assignment UI also reads it.
 */
export const GET = route(async () => {
  await requireRole("admin");
  const rows = await query<{
    id: string;
    email: string;
    full_name: string;
    role: string;
    created_at: string;
  }>(
    `SELECT id, email, full_name, role, created_at
       FROM users
      WHERE role IN ('referee','admin')
      ORDER BY role DESC, created_at ASC`
  );
  return ok({
    items: rows.map((r) => ({
      id: r.id,
      email: r.email,
      fullName: r.full_name,
      role: r.role,
      createdAt: r.created_at,
    })),
  });
});
