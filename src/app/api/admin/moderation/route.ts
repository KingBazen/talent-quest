import { ok, route } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { listModerationQueue } from "@/lib/engagement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Phase 8 (P8-T008): admin moderation queue.
 *
 * GET → comments with at least one flag OR currently hidden, sorted by
 * flag_count DESC then created_at DESC.
 */

export const GET = route(async () => {
  await requireRole("admin");
  const items = await listModerationQueue({ limit: 200 });
  return ok({
    items: items.map((c) => ({
      id: c.id,
      contestantId: c.contestant_id,
      contestantDisplay:
        c.contestant_stage_name ||
        (c.contestant_full_name ?? "")
          .split(" ")
          .map((p) => p[0]?.toUpperCase())
          .filter(Boolean)
          .slice(0, 2)
          .join(".") + ".",
      authorDisplay: c.author_full_name.split(" ").slice(0, 2).join(" "),
      body: c.body,
      status: c.status,
      flagCount: c.flag_count,
      createdAt: c.created_at,
    })),
    total: items.length,
  });
});
