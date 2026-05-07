import { ok, route } from "@/lib/api";
import { listEpisodes, listSeasons } from "@/lib/seasons";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Phase 10 (P10-T005): public episode list.
 *
 * Filters on status to honour the draft / publish gate — the public never
 * sees draft seasons or draft episodes.
 *
 *   ?seasonId=… → restrict to one season (must be active or closed)
 */

export const GET = route(async (req: Request) => {
  const url = new URL(req.url);
  const seasonId = url.searchParams.get("seasonId") || undefined;

  const seasons = (await listSeasons({ publicOnly: true })).filter(
    (s) => !seasonId || s.id === seasonId
  );

  // Pull episodes scoped to the public-visible seasons, then publish-only.
  const items = [];
  for (const s of seasons) {
    const eps = await listEpisodes({
      seasonId: s.id,
      publicOnly: true,
      limit: 200,
    });
    for (const e of eps) {
      items.push({
        id: e.id,
        seasonId: s.id,
        seasonNumber: s.number,
        seasonTitle: s.title,
        number: e.number,
        title: e.title,
        summary: e.summary,
        thumbnailUrl: e.thumbnail_url,
        scheduledFor: e.scheduled_for,
        status: e.status,
        airedAt: e.aired_at,
      });
    }
  }

  return ok({
    seasons: seasons.map((s) => ({
      id: s.id,
      number: s.number,
      title: s.title,
      summary: s.summary,
      status: s.status,
    })),
    items,
  });
});
