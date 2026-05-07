import { exec, queryOne } from "./db";

/**
 * Runtime-settings helpers. Values are stored as JSONB so toggles ("registration
 * open?") share the same table as enums ("fee_required_at") and integers
 * ("fee_cents"). Use the typed helpers below; only fall through to `getRaw`
 * when adding a new key.
 *
 * The settings table is seeded with sensible defaults in `doMigrate()`. Reads
 * always return the on-disk value or the supplied fallback.
 */

export type FeeRequiredAt = "apply" | "shortlist";

export interface KnownSettings {
  fee_required_at: FeeRequiredAt;
  fee_cents: number;
  registration_open: boolean;
  submissions_open: boolean;
  current_round: number;
  /** Phase 9 — global voting kill-switch. When false, /api/contestants/[id]/vote
   *  rejects with 403. Toggle from /admin/voting. */
  voting_open: boolean;
  /** Phase 9 — round identifier on every vote row. Historically this is the
   *  same as `current_round` but they decouple if/when voting closes a round
   *  before the producer publishes results. */
  voting_round: number;
}

export const SETTINGS_DEFAULTS: KnownSettings = {
  fee_required_at: "apply",
  fee_cents: 50000,
  registration_open: true,
  submissions_open: true,
  current_round: 1,
  voting_open: false,
  voting_round: 1,
};

interface RawValueRow {
  value: unknown;
}

async function getRaw<T>(key: string): Promise<T | undefined> {
  const row = await queryOne<RawValueRow>(
    "SELECT value FROM settings WHERE key = ?",
    [key]
  );
  return (row?.value as T | undefined) ?? undefined;
}

export async function getSetting<K extends keyof KnownSettings>(
  key: K
): Promise<KnownSettings[K]> {
  const v = await getRaw<KnownSettings[K]>(key);
  return v !== undefined ? v : SETTINGS_DEFAULTS[key];
}

export async function setSetting<K extends keyof KnownSettings>(
  key: K,
  value: KnownSettings[K],
  updatedByUserId?: string | null
): Promise<void> {
  await exec(
    `INSERT INTO settings (key, value, updated_by_user_id, updated_at)
     VALUES (?, ?::jsonb, ?, (CURRENT_TIMESTAMP::text))
     ON CONFLICT (key)
     DO UPDATE SET value = excluded.value,
                   updated_by_user_id = excluded.updated_by_user_id,
                   updated_at = excluded.updated_at`,
    [key, JSON.stringify(value), updatedByUserId ?? null]
  );
}

export async function getAllSettings(): Promise<KnownSettings> {
  // One query, then merge defaults for any missing key.
  const rows = await (await import("./db")).query<{
    key: string;
    value: unknown;
  }>("SELECT key, value FROM settings");
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    fee_required_at:
      (map.get("fee_required_at") as FeeRequiredAt) ??
      SETTINGS_DEFAULTS.fee_required_at,
    fee_cents:
      (map.get("fee_cents") as number) ?? SETTINGS_DEFAULTS.fee_cents,
    registration_open:
      (map.get("registration_open") as boolean) ??
      SETTINGS_DEFAULTS.registration_open,
    submissions_open:
      (map.get("submissions_open") as boolean) ??
      SETTINGS_DEFAULTS.submissions_open,
    current_round:
      (map.get("current_round") as number) ?? SETTINGS_DEFAULTS.current_round,
    voting_open:
      (map.get("voting_open") as boolean) ?? SETTINGS_DEFAULTS.voting_open,
    voting_round:
      (map.get("voting_round") as number) ?? SETTINGS_DEFAULTS.voting_round,
  };
}
