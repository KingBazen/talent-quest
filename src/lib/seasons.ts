import crypto from "node:crypto";
import {
  exec,
  query,
  queryOne,
  type EpisodeRow,
  type EpisodeStatus,
  type SeasonRow,
  type SeasonStatus,
  type EliminationRow,
  type ChallengeRow,
  type PerformanceRow,
} from "./db";
import { recordAudit } from "./audit-logs";

/**
 * Phase 10 — seasons, episodes, challenges, performances, eliminations.
 *
 * The split:
 *   - Producer / admin own the writes (this lib). Audit-logged everywhere.
 *   - Public reads filter on status:
 *       seasons.status IN ('active','closed')
 *       episodes.status IN ('scheduled','aired')
 *     so the producer can build a 24-episode plan as drafts and reveal them
 *     one episode at a time.
 *
 * Eliminations are append-only — one row per (episode, contestant). The
 * writer also flips contestants.status = 'eliminated' so /result-checker
 * stays consistent without a JOIN.
 */

// ─── Seasons ────────────────────────────────────────────────────────────────

export async function listSeasons(opts?: {
  publicOnly?: boolean;
}): Promise<SeasonRow[]> {
  const where = opts?.publicOnly ? "WHERE status IN ('active','closed')" : "";
  return query<SeasonRow>(
    `SELECT * FROM seasons ${where} ORDER BY number DESC`,
    []
  );
}

export async function getSeasonById(
  id: string
): Promise<SeasonRow | undefined> {
  return queryOne<SeasonRow>(`SELECT * FROM seasons WHERE id = ?`, [id]);
}

export async function getSeasonByNumber(
  number: number
): Promise<SeasonRow | undefined> {
  return queryOne<SeasonRow>(`SELECT * FROM seasons WHERE number = ?`, [
    number,
  ]);
}

export async function createSeason(input: {
  number: number;
  title: string;
  summary?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  createdByUserId?: string | null;
}): Promise<SeasonRow> {
  const id = "season_" + crypto.randomBytes(8).toString("hex");
  await exec(
    `INSERT INTO seasons (id, number, title, summary, starts_at, ends_at, created_by_user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.number,
      input.title,
      input.summary ?? null,
      input.startsAt ?? null,
      input.endsAt ?? null,
      input.createdByUserId ?? null,
    ]
  );
  return (await getSeasonById(id))!;
}

export async function updateSeason(
  id: string,
  patch: Partial<
    Pick<SeasonRow, "title" | "summary" | "status" | "starts_at" | "ends_at">
  >
): Promise<void> {
  const updates: string[] = [];
  const params: unknown[] = [];
  for (const [k, v] of Object.entries(patch)) {
    updates.push(`${k} = ?`);
    params.push(v);
  }
  if (updates.length === 0) return;
  params.push(id);
  await exec(`UPDATE seasons SET ${updates.join(", ")} WHERE id = ?`, params);
}

// ─── Episodes ───────────────────────────────────────────────────────────────

export async function listEpisodes(opts: {
  seasonId?: string;
  publicOnly?: boolean;
  limit?: number;
}): Promise<EpisodeRow[]> {
  const filters: string[] = [];
  const params: unknown[] = [];
  if (opts.seasonId) {
    filters.push("season_id = ?");
    params.push(opts.seasonId);
  }
  if (opts.publicOnly) {
    filters.push("status IN ('scheduled','aired')");
  }
  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const limit = Math.min(Math.max(opts.limit ?? 100, 1), 500);
  return query<EpisodeRow>(
    `SELECT * FROM episodes ${where} ORDER BY number ASC LIMIT ${limit}`,
    params
  );
}

export async function getEpisodeById(
  id: string
): Promise<EpisodeRow | undefined> {
  return queryOne<EpisodeRow>(`SELECT * FROM episodes WHERE id = ?`, [id]);
}

export async function createEpisode(input: {
  seasonId: string;
  number: number;
  title: string;
  summary?: string | null;
  scheduledFor?: string | null;
  thumbnailUrl?: string | null;
}): Promise<EpisodeRow> {
  const id = "ep_" + crypto.randomBytes(8).toString("hex");
  await exec(
    `INSERT INTO episodes (id, season_id, number, title, summary, scheduled_for, thumbnail_url)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.seasonId,
      input.number,
      input.title,
      input.summary ?? null,
      input.scheduledFor ?? null,
      input.thumbnailUrl ?? null,
    ]
  );
  return (await getEpisodeById(id))!;
}

export async function updateEpisode(
  id: string,
  patch: Partial<
    Pick<
      EpisodeRow,
      | "title"
      | "summary"
      | "thumbnail_url"
      | "scheduled_for"
      | "status"
      | "aired_at"
    >
  >
): Promise<void> {
  const updates: string[] = [];
  const params: unknown[] = [];
  for (const [k, v] of Object.entries(patch)) {
    updates.push(`${k} = ?`);
    params.push(v);
  }
  if (updates.length === 0) return;
  params.push(id);
  await exec(`UPDATE episodes SET ${updates.join(", ")} WHERE id = ?`, params);
}

/**
 * Move an episode through the publication lifecycle. Convenience wrapper
 * around updateEpisode that audit-logs the transition and stamps aired_at on
 * the way to "aired".
 */
export async function setEpisodeStatus(input: {
  episodeId: string;
  status: EpisodeStatus;
  actorUserId: string;
  reason?: string | null;
}): Promise<void> {
  const before = await getEpisodeById(input.episodeId);
  if (!before) throw new Error(`Episode ${input.episodeId} not found`);
  if (before.status === input.status) return;

  const patch: Partial<EpisodeRow> = { status: input.status };
  if (input.status === "aired" && !before.aired_at) {
    patch.aired_at = new Date().toISOString();
  }
  await updateEpisode(input.episodeId, patch);

  await recordAudit({
    actorUserId: input.actorUserId,
    targetType: "round",
    targetId: input.episodeId,
    action: `episode.${input.status}`,
    reason: input.reason ?? null,
    payload: {
      status_before: before.status,
      status_after: input.status,
      season_id: before.season_id,
      episode_number: before.number,
    },
  });
}

// ─── Challenges ─────────────────────────────────────────────────────────────

export async function listChallengesForEpisode(
  episodeId: string
): Promise<ChallengeRow[]> {
  return query<ChallengeRow>(
    `SELECT * FROM challenges WHERE episode_id = ? ORDER BY created_at ASC`,
    [episodeId]
  );
}

export async function createChallenge(input: {
  episodeId: string;
  title: string;
  description?: string | null;
  pointsMax?: number;
}): Promise<ChallengeRow> {
  const id = "ch_" + crypto.randomBytes(8).toString("hex");
  await exec(
    `INSERT INTO challenges (id, episode_id, title, description, points_max)
     VALUES (?, ?, ?, ?, ?)`,
    [
      id,
      input.episodeId,
      input.title,
      input.description ?? null,
      input.pointsMax ?? 100,
    ]
  );
  return (await queryOne<ChallengeRow>(
    `SELECT * FROM challenges WHERE id = ?`,
    [id]
  ))!;
}

// ─── Performances ───────────────────────────────────────────────────────────

export async function listPerformancesForEpisode(
  episodeId: string
): Promise<PerformanceRow[]> {
  return query<PerformanceRow>(
    `SELECT * FROM performances WHERE episode_id = ? ORDER BY created_at ASC`,
    [episodeId]
  );
}

export async function listPerformancesForContestant(
  contestantId: string
): Promise<PerformanceRow[]> {
  return query<PerformanceRow>(
    `SELECT * FROM performances WHERE contestant_id = ? ORDER BY created_at DESC`,
    [contestantId]
  );
}

// ─── Eliminations ───────────────────────────────────────────────────────────

export async function listEliminationsForEpisode(
  episodeId: string
): Promise<EliminationRow[]> {
  return query<EliminationRow>(
    `SELECT * FROM eliminations WHERE episode_id = ? ORDER BY eliminated_at DESC`,
    [episodeId]
  );
}

export async function getLatestEliminationForContestant(
  contestantId: string
): Promise<EliminationRow | undefined> {
  return queryOne<EliminationRow>(
    `SELECT * FROM eliminations WHERE contestant_id = ?
     ORDER BY eliminated_at DESC LIMIT 1`,
    [contestantId]
  );
}

/**
 * Cascade: write the elimination row + flip contestants.status = 'eliminated'
 * + audit-log both events. The cascade lives here (not in a DB trigger) so
 * it stays visible in the audit log and so we can extend the policy without
 * a migration.
 */
export async function eliminateContestant(input: {
  episodeId: string;
  contestantId: string;
  reason?: string | null;
  actorUserId: string;
}): Promise<EliminationRow> {
  const id = "elim_" + crypto.randomBytes(8).toString("hex");
  await exec(
    `INSERT INTO eliminations (id, episode_id, contestant_id, reason, created_by_user_id)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (episode_id, contestant_id) DO NOTHING`,
    [
      id,
      input.episodeId,
      input.contestantId,
      input.reason ?? null,
      input.actorUserId,
    ]
  );

  // Flip contestant status. We only flip from non-terminal states — never
  // resurrect a contestant who is already eliminated by another path.
  const before = await queryOne<{ status: string }>(
    `SELECT status FROM contestants WHERE id = ?`,
    [input.contestantId]
  );
  if (before && before.status !== "eliminated") {
    await exec(
      `UPDATE contestants SET status = 'eliminated' WHERE id = ?`,
      [input.contestantId]
    );
    await recordAudit({
      actorUserId: input.actorUserId,
      targetType: "contestant",
      targetId: input.contestantId,
      action: "contestant.status_change",
      reason: input.reason ?? "Eliminated on episode publication",
      payload: {
        status_before: before.status,
        status_after: "eliminated",
        episode_id: input.episodeId,
        source: "episode_elimination",
      },
    });
  }

  await recordAudit({
    actorUserId: input.actorUserId,
    targetType: "contestant",
    targetId: input.contestantId,
    action: "elimination.create",
    reason: input.reason ?? null,
    payload: { episode_id: input.episodeId },
  });

  return (await queryOne<EliminationRow>(
    `SELECT * FROM eliminations WHERE episode_id = ? AND contestant_id = ?`,
    [input.episodeId, input.contestantId]
  ))!;
}
