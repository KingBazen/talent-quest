import crypto from "node:crypto";
import {
  exec,
  query,
  queryOne,
  type CommentRow,
  type ModerationActionRow,
} from "./db";

/**
 * Phase 8 — engagement primitives.
 *
 * Likes, follows, and comments share the same shape conventions:
 *   - composite-PK on the natural key so dup-inserts are no-ops
 *   - status column on comments so moderation can hide-without-delete
 *   - "list with my-state" reads include a JOIN to the requester's likes /
 *     follows so the UI can render the toggled state in a single query
 */

// ─── Likes ──────────────────────────────────────────────────────────────────

export async function toggleLike(
  audienceUserId: string,
  contestantId: string
): Promise<{ liked: boolean; total: number }> {
  // ON CONFLICT (...) DO NOTHING returns 1 row if inserted, 0 if duplicate.
  const inserted = await queryOne<{ inserted: number }>(
    `INSERT INTO engagement_likes (audience_user_id, contestant_id)
     VALUES (?, ?)
     ON CONFLICT (audience_user_id, contestant_id) DO NOTHING
     RETURNING 1 AS inserted`,
    [audienceUserId, contestantId]
  );

  if (!inserted) {
    // Already liked → toggle off.
    await exec(
      `DELETE FROM engagement_likes
        WHERE audience_user_id = ? AND contestant_id = ?`,
      [audienceUserId, contestantId]
    );
  }

  const total = await countLikes(contestantId);
  return { liked: !!inserted, total };
}

export async function countLikes(contestantId: string): Promise<number> {
  const r = await queryOne<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM engagement_likes WHERE contestant_id = ?`,
    [contestantId]
  );
  return r?.n ?? 0;
}

export async function userHasLiked(
  audienceUserId: string,
  contestantId: string
): Promise<boolean> {
  const r = await queryOne<{ n: number }>(
    `SELECT 1 AS n FROM engagement_likes
     WHERE audience_user_id = ? AND contestant_id = ?`,
    [audienceUserId, contestantId]
  );
  return !!r;
}

// ─── Follows ────────────────────────────────────────────────────────────────

export async function toggleFollow(
  audienceUserId: string,
  contestantId: string
): Promise<{ following: boolean; total: number }> {
  const inserted = await queryOne<{ inserted: number }>(
    `INSERT INTO engagement_follows (audience_user_id, contestant_id)
     VALUES (?, ?)
     ON CONFLICT (audience_user_id, contestant_id) DO NOTHING
     RETURNING 1 AS inserted`,
    [audienceUserId, contestantId]
  );

  if (!inserted) {
    await exec(
      `DELETE FROM engagement_follows
        WHERE audience_user_id = ? AND contestant_id = ?`,
      [audienceUserId, contestantId]
    );
  }

  const total = await countFollowers(contestantId);
  return { following: !!inserted, total };
}

export async function countFollowers(contestantId: string): Promise<number> {
  const r = await queryOne<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM engagement_follows WHERE contestant_id = ?`,
    [contestantId]
  );
  return r?.n ?? 0;
}

export async function userIsFollowing(
  audienceUserId: string,
  contestantId: string
): Promise<boolean> {
  const r = await queryOne<{ n: number }>(
    `SELECT 1 AS n FROM engagement_follows
     WHERE audience_user_id = ? AND contestant_id = ?`,
    [audienceUserId, contestantId]
  );
  return !!r;
}

/** All audience user_ids that follow a contestant — used by notify-on-status. */
export async function listFollowerUserIds(
  contestantId: string
): Promise<string[]> {
  const rows = await query<{ audience_user_id: string }>(
    `SELECT audience_user_id FROM engagement_follows WHERE contestant_id = ?`,
    [contestantId]
  );
  return rows.map((r) => r.audience_user_id);
}

// ─── Comments ───────────────────────────────────────────────────────────────

export interface CommentWithAuthor extends CommentRow {
  author_full_name: string;
  author_role: string;
}

export async function postComment(input: {
  contestantId: string;
  authorUserId: string;
  body: string;
}): Promise<CommentRow> {
  const id = "cm_" + crypto.randomBytes(8).toString("hex");
  await exec(
    `INSERT INTO comments (id, contestant_id, author_user_id, body)
     VALUES (?, ?, ?, ?)`,
    [id, input.contestantId, input.authorUserId, input.body]
  );
  return (await queryOne<CommentRow>(
    `SELECT * FROM comments WHERE id = ?`,
    [id]
  ))!;
}

export async function listComments(opts: {
  contestantId: string;
  limit?: number;
  includeHidden?: boolean;
}): Promise<CommentWithAuthor[]> {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const where = opts.includeHidden
    ? `c.contestant_id = ? AND c.status <> 'removed'`
    : `c.contestant_id = ? AND c.status = 'visible'`;
  return query<CommentWithAuthor>(
    `SELECT c.*, u.full_name AS author_full_name, u.role AS author_role
       FROM comments c
       JOIN users u ON u.id = c.author_user_id
      WHERE ${where}
      ORDER BY c.created_at DESC
      LIMIT ${limit}`,
    [opts.contestantId]
  );
}

export async function getCommentById(
  id: string
): Promise<CommentRow | undefined> {
  return queryOne<CommentRow>(`SELECT * FROM comments WHERE id = ?`, [id]);
}

export async function setCommentStatus(
  id: string,
  status: "visible" | "hidden" | "removed"
): Promise<void> {
  await exec(`UPDATE comments SET status = ? WHERE id = ?`, [status, id]);
}

export async function incrementCommentFlag(id: string): Promise<number> {
  const r = await queryOne<{ flag_count: number }>(
    `UPDATE comments SET flag_count = flag_count + 1 WHERE id = ?
     RETURNING flag_count`,
    [id]
  );
  return r?.flag_count ?? 0;
}

// ─── Moderation actions ─────────────────────────────────────────────────────

export async function recordModerationAction(input: {
  targetType: "comment" | "submission";
  targetId: string;
  action: "report" | "hide" | "unhide" | "remove";
  actorUserId: string | null;
  reason?: string | null;
}): Promise<void> {
  const id = "mod_" + crypto.randomBytes(8).toString("hex");
  await exec(
    `INSERT INTO moderation_actions
       (id, target_type, target_id, action, actor_user_id, reason)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.targetType,
      input.targetId,
      input.action,
      input.actorUserId,
      input.reason ?? null,
    ]
  );
}

/**
 * Moderation queue: comments with at least one report OR currently hidden.
 * Joined with author + contestant for display.
 */
export interface ModerationQueueItem extends CommentRow {
  author_full_name: string;
  contestant_full_name: string;
  contestant_stage_name: string | null;
}

export async function listModerationQueue(opts: {
  limit?: number;
}): Promise<ModerationQueueItem[]> {
  const limit = Math.min(Math.max(opts.limit ?? 100, 1), 500);
  return query<ModerationQueueItem>(
    `SELECT c.*,
            u.full_name  AS author_full_name,
            cu.full_name AS contestant_full_name,
            ct.stage_name AS contestant_stage_name
       FROM comments c
       JOIN users u    ON u.id = c.author_user_id
       JOIN contestants ct ON ct.id = c.contestant_id
       JOIN users cu   ON cu.id = ct.user_id
      WHERE c.flag_count > 0 OR c.status <> 'visible'
      ORDER BY c.flag_count DESC, c.created_at DESC
      LIMIT ${limit}`,
    []
  );
}

export async function listModerationActionsForTarget(
  targetType: "comment" | "submission",
  targetId: string
): Promise<ModerationActionRow[]> {
  return query<ModerationActionRow>(
    `SELECT * FROM moderation_actions
      WHERE target_type = ? AND target_id = ?
      ORDER BY created_at DESC`,
    [targetType, targetId]
  );
}
