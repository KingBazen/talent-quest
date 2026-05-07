import { z } from "zod";
import { ok, parseJson, route } from "@/lib/api";
import { ApiError, requireRole } from "@/lib/auth";
import {
  getEpisodeById,
  listChallengesForEpisode,
  listEliminationsForEpisode,
  listPerformancesForEpisode,
  setEpisodeStatus,
  updateEpisode,
} from "@/lib/seasons";
import { recordAudit } from "@/lib/audit-logs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Phase 10: per-episode producer view + metadata patch + status transitions.
 *
 *   GET   → episode + challenges + performances + eliminations
 *   PATCH → mutate metadata; status transitions also stamp aired_at + audit
 */

export const GET = route(async (_req, ctx: { params: { id: string } }) => {
  await requireRole("producer", "admin");
  const episode = await getEpisodeById(ctx.params.id);
  if (!episode) throw new ApiError(404, "Episode not found");
  const [challenges, performances, eliminations] = await Promise.all([
    listChallengesForEpisode(ctx.params.id),
    listPerformancesForEpisode(ctx.params.id),
    listEliminationsForEpisode(ctx.params.id),
  ]);
  return ok({ episode, challenges, performances, eliminations });
});

const PatchBody = z.object({
  title: z.string().min(2).max(160).optional(),
  summary: z.string().max(2000).optional(),
  thumbnail_url: z.string().url().optional().or(z.literal("")),
  scheduled_for: z.string().optional(),
  status: z.enum(["draft", "scheduled", "aired", "archived"]).optional(),
  reason: z.string().max(500).optional(),
});

export const PATCH = route(async (req, ctx: { params: { id: string } }) => {
  const session = await requireRole("producer", "admin");
  const before = await getEpisodeById(ctx.params.id);
  if (!before) throw new ApiError(404, "Episode not found");

  const data = await parseJson(req, PatchBody);

  // Status transitions go through setEpisodeStatus so the audit + aired_at
  // stamp happen consistently.
  if (data.status && data.status !== before.status) {
    await setEpisodeStatus({
      episodeId: ctx.params.id,
      status: data.status,
      actorUserId: session.sub,
      reason: data.reason ?? null,
    });
  }

  // Other metadata patches are a plain UPDATE.
  const { status: _status, reason: _reason, ...meta } = data;
  void _status;
  void _reason;
  if (Object.keys(meta).length > 0) {
    await updateEpisode(ctx.params.id, meta);
    await recordAudit({
      actorUserId: session.sub,
      targetType: "round",
      targetId: ctx.params.id,
      action: "episode.update",
      payload: { changed: meta },
    });
  }

  const after = await getEpisodeById(ctx.params.id);
  return ok({ episode: after });
});
