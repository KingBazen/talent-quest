import { exec, queryOne, type NotificationPrefs } from "./db";

/**
 * Phase 7 (P7-T011): per-user notification preferences.
 *
 * Stored as a JSONB blob on `users.notification_prefs`. Default is `{}` —
 * everything on. The sender treats `undefined` and `true` as opt-in, only
 * `false` as opt-out. That gives us forward-compatibility: adding a new
 * preference key doesn't have to touch existing rows.
 */

export const PREF_KEYS = [
  "email_status_changes",
  "email_payment_updates",
  "email_referee_assignments",
] as const;

export type PrefKey = (typeof PREF_KEYS)[number];

export async function getPrefs(userId: string): Promise<NotificationPrefs> {
  const row = await queryOne<{ notification_prefs: NotificationPrefs | null }>(
    `SELECT notification_prefs FROM users WHERE id = ?`,
    [userId]
  );
  return row?.notification_prefs ?? {};
}

export async function setPrefs(
  userId: string,
  patch: Partial<NotificationPrefs>
): Promise<NotificationPrefs> {
  const current = await getPrefs(userId);
  const next: NotificationPrefs = { ...current, ...patch };
  await exec(
    `UPDATE users SET notification_prefs = ?::jsonb WHERE id = ?`,
    [JSON.stringify(next), userId]
  );
  return next;
}

/**
 * Sender-side helper: should we send this email kind to this user?
 *
 * Default opt-in. `false` is the only value that suppresses the send.
 */
export function isOptedIn(prefs: NotificationPrefs, key: PrefKey): boolean {
  return prefs[key] !== false;
}
