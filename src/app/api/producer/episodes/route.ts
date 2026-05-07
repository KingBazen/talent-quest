import { z } from "zod";
import { ok, parseJson, route } from "@/lib/api";
import { ApiError, requireRole } from "@/lib/auth";
import {
  createEpisode,
  getSeasonById,
  listEpisodes,
} from "@/lib/seasons";
import { recordAudit } from "@/lib/audit-logs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Phase 10: producer episode CRUD.
 *
 *  GET ?seasonId=… → list episodes in a season (drafts included)
 *  POST { seasonId, number, title, summary?, scheduledFor?, thumbnailUrl? }
 */

export const GET = route(async (req: Request) => {
  await requireRole("producer", "admin");
  const url = new URL(req.url);
  const seasonId = url.searchParams.get("seasonId") || undefined;
  const items = await listEpisodes({ seasonId, limit: 200 });
  return ok({ items });
});

const PostBody = z.object({
  seasonId: z.string().min(3),
  number: z.number().int().min(1).max(99),
  title: z.string().min(2).max(160),
  summary: z.string().max(2000).optional().or(z.literal("")),
  scheduledFor: z.string().optional().or(z.literal("")),
  thumbnailUrl: z.string().url().optional().or(z.literal("")),
});

export const POST = route(async (req: Request) => {
  const session = await requireRole("producer", "admin");
  const data = await parseJson(req, PostBody);

  const season = await getSeasonById(data.seasonId);
  if (!season) throw new ApiError(404, "Season not found");

  const episode = await createEpisode({
    seasonId: data.seasonId,
    number: data.number,
    title: data.title,
    summary: data.summary || null,
    scheduledFor: data.scheduledFor || null,
    thumbnailUrl: data.thumbnailUrl || null,
  });

  await recordAudit({
    actorUserId: session.sub,
    targetType: "round",
    targetId: episode.id,
    action: "episode.create",
    payload: {
      season_id: episode.season_id,
      number: episode.number,
      title: episode.title,
    },
  });

  return ok({ episode }, { status: 201 });
});
