import crypto from "node:crypto";
import { exec, query, type NotificationRow } from "./db";

/**
 * Phase 7 (P7-T005): in-app notification inbox.
 *
 * Every transactional email also lands here so a user who missed the email
 * still has the receipt in the app. Append-only from the writer's side;
 * read_at is the only mutable column.
 *
 * `kind` is a short namespaced string ("contestant.welcome",
 * "contestant.status_change", "payment.receipt", "referee.assignment", ...) —
 * the UI groups by kind for filtering / preference toggles.
 */

export interface RecordNotificationInput {
  userId: string;
  kind: string;
  title: string;
  body: string;
  link?: string | null;
}

export async function recordNotification(
  input: RecordNotificationInput
): Promise<void> {
  const id = "n_" + crypto.randomBytes(8).toString("hex");
  await exec(
    `INSERT INTO notifications (id, user_id, kind, title, body, link)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, input.userId, input.kind, input.title, input.body, input.link ?? null]
  );
}

export async function listNotifications(opts: {
  userId: string;
  limit?: number;
  unreadOnly?: boolean;
}): Promise<NotificationRow[]> {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const where = opts.unreadOnly
    ? "WHERE user_id = ? AND read_at IS NULL"
    : "WHERE user_id = ?";
  return query<NotificationRow>(
    `SELECT * FROM notifications ${where} ORDER BY created_at DESC LIMIT ${limit}`,
    [opts.userId]
  );
}

export async function countUnread(userId: string): Promise<number> {
  const rows = await query<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM notifications
     WHERE user_id = ? AND read_at IS NULL`,
    [userId]
  );
  return rows[0]?.n ?? 0;
}

export async function markRead(
  userId: string,
  ids: string[] | "all"
): Promise<void> {
  const now = new Date().toISOString();
  if (ids === "all") {
    await exec(
      `UPDATE notifications SET read_at = ?
        WHERE user_id = ? AND read_at IS NULL`,
      [now, userId]
    );
    return;
  }
  if (ids.length === 0) return;
  // Build a parameterised IN clause inline. ids are agent-generated (we
  // re-validate they belong to this user via the user_id filter), so this
  // can't smuggle SQL.
  const placeholders = ids.map(() => "?").join(",");
  await exec(
    `UPDATE notifications SET read_at = ?
      WHERE user_id = ? AND id IN (${placeholders})`,
    [now, userId, ...ids]
  );
}
