import { ok, route } from "@/lib/api";
import { ApiError, readSession } from "@/lib/auth";
import {
  countClipLikes,
  getClipById,
  userHasLikedClip,
  userHasWatchlisted,
} from "@/lib/media-clips";
import { queryOne } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Phase 11 (P11-T005): public clip detail.
 *
 * Returns 404 if the clip itself is not published. Adds my-state
 * (liked / watchlisted) for signed-in users so the UI can render the toggled
 * buttons in a single round-trip.
 */

export const GET = route(async (_req, ctx: { params: { id: string } }) => {
  const clip = await getClipById(ctx.params.id);
  if (!clip || clip.status !== "published") {
    throw new ApiError(404, "Clip not found");
  }

  // Resolve display strings for the contestant + episode without exposing
  // PII. Uses initials fallback to honour the anonymisation contract.
  let contestantDisplay: string | null = null;
  if (clip.contestant_id) {
    const c = await queryOne<{ stage_name: string | null; full_name: string }>(
      `SELECT c.stage_name, u.full_name
         FROM contestants c JOIN users u ON u.id = c.user_id
        WHERE c.id = ?`,
      [clip.contestant_id]
    );
    if (c) {
      contestantDisplay =
        c.stage_name ||
        (c.full_name ?? "")
          .split(" ")
          .map((p) => p[0]?.toUpperCase())
          .filter(Boolean)
          .slice(0, 2)
          .join(".") + ".";
    }
  }

  let episodeTitle: string | null = null;
  if (clip.episode_id) {
    const e = await queryOne<{ title: string }>(
      `SELECT title FROM episodes WHERE id = ?`,
      [clip.episode_id]
    );
    episodeTitle = e?.title ?? null;
  }

  const likes = await countClipLikes(clip.id);
  const session = await readSession();
  let myLiked = false;
  let myWatchlisted = false;
  if (session) {
    [myLiked, myWatchlisted] = await Promise.all([
      userHasLikedClip(session.sub, clip.id),
      userHasWatchlisted(session.sub, clip.id),
    ]);
  }

  return ok({
    clip: {
      id: clip.id,
      title: clip.title,
      summary: clip.summary,
      kind: clip.kind,
      category: clip.category,
      videoUrl: clip.video_url,
      thumbnailUrl: clip.thumbnail_url,
      durationSec: clip.duration_sec,
      provider: clip.provider,
      publishedAt: clip.published_at,
    },
    contestantId: clip.contestant_id,
    contestantDisplay,
    episodeId: clip.episode_id,
    episodeTitle,
    engagement: { likes, myLiked, myWatchlisted },
  });
});
