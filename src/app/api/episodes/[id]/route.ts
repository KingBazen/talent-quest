import { ok, route } from "@/lib/api";
import { ApiError } from "@/lib/auth";
import {
  getEpisodeById,
  getSeasonById,
  listChallengesForEpisode,
  listEliminationsForEpisode,
  listPerformancesForEpisode,
} from "@/lib/seasons";
import { query } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Phase 10 (P10-T005): public episode detail.
 *
 * Returns 404 if the episode itself OR its season is unpublished. Performances
 * carry an anonymised contestant projection (stage_name → initials fallback)
 * so the public never sees the full name.
 */

export const GET = route(async (_req, ctx: { params: { id: string } }) => {
  const episode = await getEpisodeById(ctx.params.id);
  if (!episode) throw new ApiError(404, "Episode not found");
  if (!["scheduled", "aired"].includes(episode.status))
    throw new ApiError(404, "Episode not found");

  const season = await getSeasonById(episode.season_id);
  if (!season) throw new ApiError(404, "Episode not found");
  if (!["active", "closed"].includes(season.status))
    throw new ApiError(404, "Episode not found");

  const [challenges, performances, eliminations] = await Promise.all([
    listChallengesForEpisode(ctx.params.id),
    listPerformancesForEpisode(ctx.params.id),
    listEliminationsForEpisode(ctx.params.id),
  ]);

  // Resolve display names for performances + eliminations in a single batch
  // query (avoids N+1 on a 12-contestant episode).
  const contestantIds = Array.from(
    new Set(
      [
        ...performances.map((p) => p.contestant_id),
        ...eliminations.map((e) => e.contestant_id),
      ].filter(Boolean)
    )
  );

  let displayMap = new Map<string, string>();
  if (contestantIds.length > 0) {
    const placeholders = contestantIds.map(() => "?").join(",");
    const rows = await query<{
      id: string;
      stage_name: string | null;
      full_name: string;
    }>(
      `SELECT c.id, c.stage_name, u.full_name
         FROM contestants c
         JOIN users u ON u.id = c.user_id
        WHERE c.id IN (${placeholders})`,
      contestantIds
    );
    displayMap = new Map(
      rows.map((r) => [
        r.id,
        r.stage_name ||
          (r.full_name ?? "")
            .split(" ")
            .map((p) => p[0]?.toUpperCase())
            .filter(Boolean)
            .slice(0, 2)
            .join(".") + ".",
      ])
    );
  }

  return ok({
    season: {
      id: season.id,
      number: season.number,
      title: season.title,
    },
    episode: {
      id: episode.id,
      number: episode.number,
      title: episode.title,
      summary: episode.summary,
      thumbnailUrl: episode.thumbnail_url,
      scheduledFor: episode.scheduled_for,
      status: episode.status,
      airedAt: episode.aired_at,
    },
    challenges: challenges.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      pointsMax: c.points_max,
    })),
    performances: performances.map((p) => ({
      id: p.id,
      contestantId: p.contestant_id,
      contestantDisplay: displayMap.get(p.contestant_id) ?? "—",
      challengeId: p.challenge_id,
      videoUrl: p.video_url,
      score: p.score,
      notes: p.notes,
    })),
    eliminations: eliminations.map((e) => ({
      contestantId: e.contestant_id,
      contestantDisplay: displayMap.get(e.contestant_id) ?? "—",
      reason: e.reason,
      eliminatedAt: e.eliminated_at,
    })),
  });
});
