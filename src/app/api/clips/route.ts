import { ok, route } from "@/lib/api";
import { listClips } from "@/lib/media-clips";
import type { ClipKind } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Phase 11 (P11-T004): public clip browser feed.
 *
 *   ?kind=highlight|reel|full
 *   ?category=rap|singing|...
 *   ?contestantId=…
 *   ?episodeId=…
 *   ?q=…
 *   ?limit=… (default 60, max 200)
 */

export const GET = route(async (req: Request) => {
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind") as ClipKind | null;
  const items = await listClips({
    publicOnly: true,
    kind: kind ?? undefined,
    category: url.searchParams.get("category") || undefined,
    contestantId: url.searchParams.get("contestantId") || undefined,
    episodeId: url.searchParams.get("episodeId") || undefined,
    q: url.searchParams.get("q") || undefined,
    limit: Number(url.searchParams.get("limit") ?? 60),
  });
  return ok({ items });
});
