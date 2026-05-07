import crypto from "node:crypto";
import {
  exec,
  query,
  queryOne,
  type ClipKind,
  type ClipProvider,
  type ClipStatus,
  type MediaClipRow,
} from "./db";

/**
 * Phase 11 — media clips library.
 *
 * Three flavours of clip:
 *   - highlight: curated moment from an episode
 *   - reel:      short-form vertical clip
 *   - full:      full-length performance
 *
 * Reads always project a slim DTO with display-friendly defaults. The list
 * helpers JOIN the contestant + episode to populate display strings without
 * an N+1 — one query, one trip.
 *
 * Provider abstraction is in the schema (provider column) so we can migrate
 * one clip at a time when the founder picks Mux / Bunny.
 */

export interface CreateClipInput {
  title: string;
  summary?: string | null;
  contestantId?: string | null;
  episodeId?: string | null;
  performanceId?: string | null;
  kind?: ClipKind;
  category?: string | null;
  videoUrl: string;
  thumbnailUrl?: string | null;
  durationSec?: number | null;
  provider?: ClipProvider;
  status?: ClipStatus;
  createdByUserId?: string | null;
}

export async function createClip(input: CreateClipInput): Promise<MediaClipRow> {
  const id = "clip_" + crypto.randomBytes(8).toString("hex");
  const status: ClipStatus = input.status ?? "published";
  await exec(
    `INSERT INTO media_clips
       (id, title, summary, contestant_id, episode_id, performance_id,
        kind, category, status, provider, video_url, thumbnail_url,
        duration_sec, published_at, created_by_user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.title,
      input.summary ?? null,
      input.contestantId ?? null,
      input.episodeId ?? null,
      input.performanceId ?? null,
      input.kind ?? "highlight",
      input.category ?? null,
      status,
      input.provider ?? "cloudinary",
      input.videoUrl,
      input.thumbnailUrl ?? null,
      input.durationSec ?? null,
      status === "published" ? new Date().toISOString() : null,
      input.createdByUserId ?? null,
    ]
  );
  return (await queryOne<MediaClipRow>(
    `SELECT * FROM media_clips WHERE id = ?`,
    [id]
  ))!;
}

export async function setClipStatus(
  id: string,
  status: ClipStatus
): Promise<void> {
  await exec(
    `UPDATE media_clips
       SET status = ?,
           published_at = COALESCE(
             CASE WHEN ? = 'published' THEN published_at ELSE NULL END,
             CASE WHEN ? = 'published' THEN (CURRENT_TIMESTAMP::text) ELSE NULL END
           )
     WHERE id = ?`,
    [status, status, status, id]
  );
}

export async function getClipById(
  id: string
): Promise<MediaClipRow | undefined> {
  return queryOne<MediaClipRow>(
    `SELECT * FROM media_clips WHERE id = ?`,
    [id]
  );
}

// ─── List + browse ──────────────────────────────────────────────────────────

export interface ClipListItem {
  id: string;
  title: string;
  summary: string | null;
  kind: ClipKind;
  category: string | null;
  thumbnailUrl: string | null;
  durationSec: number | null;
  contestantDisplay: string | null;
  contestantId: string | null;
  episodeId: string | null;
  episodeTitle: string | null;
  likes: number;
  createdAt: string;
}

interface ListOpts {
  publicOnly?: boolean;
  kind?: ClipKind;
  category?: string;
  contestantId?: string;
  episodeId?: string;
  q?: string;
  limit?: number;
}

export async function listClips(opts: ListOpts = {}): Promise<ClipListItem[]> {
  const filters: string[] = [];
  const params: unknown[] = [];
  if (opts.publicOnly) {
    filters.push(`mc.status = 'published'`);
  }
  if (opts.kind) {
    filters.push(`mc.kind = ?`);
    params.push(opts.kind);
  }
  if (opts.category) {
    filters.push(`mc.category = ?`);
    params.push(opts.category);
  }
  if (opts.contestantId) {
    filters.push(`mc.contestant_id = ?`);
    params.push(opts.contestantId);
  }
  if (opts.episodeId) {
    filters.push(`mc.episode_id = ?`);
    params.push(opts.episodeId);
  }
  if (opts.q) {
    filters.push(`(mc.title ILIKE ? OR mc.summary ILIKE ?)`);
    params.push(`%${opts.q}%`, `%${opts.q}%`);
  }
  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const limit = Math.min(Math.max(opts.limit ?? 60, 1), 200);

  const rows = await query<{
    id: string;
    title: string;
    summary: string | null;
    kind: ClipKind;
    category: string | null;
    thumbnail_url: string | null;
    duration_sec: number | null;
    contestant_id: string | null;
    stage_name: string | null;
    full_name: string | null;
    episode_id: string | null;
    episode_title: string | null;
    likes: number;
    created_at: string;
  }>(
    `SELECT
        mc.id, mc.title, mc.summary, mc.kind, mc.category,
        mc.thumbnail_url, mc.duration_sec,
        mc.contestant_id, c.stage_name, u.full_name,
        mc.episode_id, e.title AS episode_title,
        COALESCE(l.n, 0)::int AS likes,
        mc.created_at
       FROM media_clips mc
       LEFT JOIN contestants c ON c.id = mc.contestant_id
       LEFT JOIN users u       ON u.id = c.user_id
       LEFT JOIN episodes e    ON e.id = mc.episode_id
       LEFT JOIN (
         SELECT clip_id, COUNT(*)::int AS n
           FROM clip_likes
          GROUP BY clip_id
       ) l ON l.clip_id = mc.id
      ${where}
      ORDER BY mc.published_at DESC NULLS LAST, mc.created_at DESC
      LIMIT ${limit}`,
    params
  );

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    summary: r.summary,
    kind: r.kind,
    category: r.category,
    thumbnailUrl: r.thumbnail_url,
    durationSec: r.duration_sec,
    contestantId: r.contestant_id,
    contestantDisplay: r.contestant_id
      ? r.stage_name ||
        (r.full_name ?? "")
          .split(" ")
          .map((p) => p[0]?.toUpperCase())
          .filter(Boolean)
          .slice(0, 2)
          .join(".") + "."
      : null,
    episodeId: r.episode_id,
    episodeTitle: r.episode_title,
    likes: r.likes,
    createdAt: r.created_at,
  }));
}

// ─── Likes ──────────────────────────────────────────────────────────────────

export async function toggleClipLike(
  userId: string,
  clipId: string
): Promise<{ liked: boolean; total: number }> {
  const inserted = await queryOne<{ inserted: number }>(
    `INSERT INTO clip_likes (user_id, clip_id)
     VALUES (?, ?)
     ON CONFLICT (user_id, clip_id) DO NOTHING
     RETURNING 1 AS inserted`,
    [userId, clipId]
  );
  if (!inserted) {
    await exec(
      `DELETE FROM clip_likes WHERE user_id = ? AND clip_id = ?`,
      [userId, clipId]
    );
  }
  const total = await countClipLikes(clipId);
  return { liked: !!inserted, total };
}

export async function countClipLikes(clipId: string): Promise<number> {
  const r = await queryOne<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM clip_likes WHERE clip_id = ?`,
    [clipId]
  );
  return r?.n ?? 0;
}

export async function userHasLikedClip(
  userId: string,
  clipId: string
): Promise<boolean> {
  const r = await queryOne<{ n: number }>(
    `SELECT 1 AS n FROM clip_likes WHERE user_id = ? AND clip_id = ?`,
    [userId, clipId]
  );
  return !!r;
}

// ─── Watchlist ──────────────────────────────────────────────────────────────

export async function toggleWatchlist(
  userId: string,
  clipId: string
): Promise<{ saved: boolean }> {
  const inserted = await queryOne<{ inserted: number }>(
    `INSERT INTO watchlist (user_id, clip_id)
     VALUES (?, ?)
     ON CONFLICT (user_id, clip_id) DO NOTHING
     RETURNING 1 AS inserted`,
    [userId, clipId]
  );
  if (!inserted) {
    await exec(
      `DELETE FROM watchlist WHERE user_id = ? AND clip_id = ?`,
      [userId, clipId]
    );
  }
  return { saved: !!inserted };
}

export async function userHasWatchlisted(
  userId: string,
  clipId: string
): Promise<boolean> {
  const r = await queryOne<{ n: number }>(
    `SELECT 1 AS n FROM watchlist WHERE user_id = ? AND clip_id = ?`,
    [userId, clipId]
  );
  return !!r;
}

export async function listWatchlist(userId: string): Promise<ClipListItem[]> {
  const rows = await query<{
    id: string;
    title: string;
    summary: string | null;
    kind: ClipKind;
    category: string | null;
    thumbnail_url: string | null;
    duration_sec: number | null;
    contestant_id: string | null;
    stage_name: string | null;
    full_name: string | null;
    episode_id: string | null;
    episode_title: string | null;
    likes: number;
    saved_at: string;
  }>(
    `SELECT
        mc.id, mc.title, mc.summary, mc.kind, mc.category,
        mc.thumbnail_url, mc.duration_sec,
        mc.contestant_id, c.stage_name, u.full_name,
        mc.episode_id, e.title AS episode_title,
        COALESCE(l.n, 0)::int AS likes,
        w.created_at AS saved_at
       FROM watchlist w
       JOIN media_clips mc ON mc.id = w.clip_id
       LEFT JOIN contestants c ON c.id = mc.contestant_id
       LEFT JOIN users u       ON u.id = c.user_id
       LEFT JOIN episodes e    ON e.id = mc.episode_id
       LEFT JOIN (
         SELECT clip_id, COUNT(*)::int AS n
           FROM clip_likes
          GROUP BY clip_id
       ) l ON l.clip_id = mc.id
      WHERE w.user_id = ? AND mc.status = 'published'
      ORDER BY w.created_at DESC
      LIMIT 200`,
    [userId]
  );

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    summary: r.summary,
    kind: r.kind,
    category: r.category,
    thumbnailUrl: r.thumbnail_url,
    durationSec: r.duration_sec,
    contestantId: r.contestant_id,
    contestantDisplay: r.contestant_id
      ? r.stage_name ||
        (r.full_name ?? "")
          .split(" ")
          .map((p) => p[0]?.toUpperCase())
          .filter(Boolean)
          .slice(0, 2)
          .join(".") + "."
      : null,
    episodeId: r.episode_id,
    episodeTitle: r.episode_title,
    likes: r.likes,
    createdAt: r.saved_at,
  }));
}
