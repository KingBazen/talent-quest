import { z } from "zod";
import { ok, parseJson, route } from "@/lib/api";
import { ApiError, requireRole } from "@/lib/auth";
import { getContestantById } from "@/lib/contestants";
import {
  eliminateContestant,
  getEpisodeById,
  listEliminationsForEpisode,
} from "@/lib/seasons";

export const runtime = "nodejs";

/**
 * Phase 10: record an elimination on a specific episode. Cascades:
 *   1. inserts an eliminations row (idempotent on (episode, contestant))
 *   2. flips contestants.status = 'eliminated' if not already terminal
 *   3. audit-logs both events under the contestant's audit log
 *
 * Bulk pattern: callers loop and POST per contestant — keeps the audit
 * trail explicit and lets the producer correct individual rows without
 * undoing a whole episode.
 */

const Body = z.object({
  contestantId: z.string().min(3),
  reason: z.string().min(0).max(500).optional(),
});

export const POST = route(async (req, ctx: { params: { id: string } }) => {
  const session = await requireRole("producer", "admin");

  const episode = await getEpisodeById(ctx.params.id);
  if (!episode) throw new ApiError(404, "Episode not found");

  const data = await parseJson(req, Body);
  const contestant = await getContestantById(data.contestantId);
  if (!contestant) throw new ApiError(404, "Contestant not found");

  const elim = await eliminateContestant({
    episodeId: ctx.params.id,
    contestantId: data.contestantId,
    reason: data.reason ?? null,
    actorUserId: session.sub,
  });

  return ok({ elimination: elim }, { status: 201 });
});

export const GET = route(async (_req, ctx: { params: { id: string } }) => {
  await requireRole("producer", "admin");
  const items = await listEliminationsForEpisode(ctx.params.id);
  return ok({ items });
});
