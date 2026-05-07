import { z } from "zod";
import { ok, parseJson, route } from "@/lib/api";
import { ApiError, requireRole } from "@/lib/auth";
import {
  getSeasonById,
  listEpisodes,
  updateSeason,
} from "@/lib/seasons";
import { recordAudit } from "@/lib/audit-logs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Phase 10: per-season producer view + status / metadata patch.
 *
 *   GET   → full season detail with episode list
 *   PATCH → mutate title / summary / status / starts_at / ends_at
 */

export const GET = route(async (_req, ctx: { params: { id: string } }) => {
  await requireRole("producer", "admin");
  const season = await getSeasonById(ctx.params.id);
  if (!season) throw new ApiError(404, "Season not found");
  const episodes = await listEpisodes({ seasonId: season.id });
  return ok({ season, episodes });
});

const PatchBody = z.object({
  title: z.string().min(2).max(120).optional(),
  summary: z.string().max(2000).optional(),
  status: z.enum(["draft", "active", "closed"]).optional(),
  starts_at: z.string().optional(),
  ends_at: z.string().optional(),
});

export const PATCH = route(async (req, ctx: { params: { id: string } }) => {
  const session = await requireRole("producer", "admin");
  const before = await getSeasonById(ctx.params.id);
  if (!before) throw new ApiError(404, "Season not found");

  const data = await parseJson(req, PatchBody);
  await updateSeason(ctx.params.id, data);

  await recordAudit({
    actorUserId: session.sub,
    targetType: "round",
    targetId: ctx.params.id,
    action: "season.update",
    payload: { changed: data, before: { status: before.status } },
  });

  const after = await getSeasonById(ctx.params.id);
  return ok({ season: after });
});
