import crypto from "node:crypto";
import { exec, query, queryOne, type VoteRow } from "./db";
import { getSetting } from "./settings";

/**
 * Phase 9 — fan voting.
 *
 * Design choices captured here so the next reader doesn't have to re-derive
 * them from the routes:
 *
 *  - One row per (voter, contestant, round). Enforced by a unique index, not
 *    by an application-level pre-check, so the race-on-double-tap impossible.
 *  - "Vote" is binary. We do not track 5-star fan ratings — that's referee
 *    territory. Fan voting answers a single question: "do you back this
 *    contestant in this round?"
 *  - IP is stored as a salted SHA-256 hash. The salt is JWT_SECRET so the
 *    hash is opaque without DB+secret access; we can still detect IP
 *    clustering by hashing a suspect IP and comparing.
 *  - Fan tallies are completely separate from judge scores. The two never
 *    add. The leaderboard renders both side by side so audiences see fan
 *    influence vs panel decision.
 */

export const SUSPICIOUS_IP_THRESHOLD = 30;

function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  const salt = process.env.JWT_SECRET || "tq-vote-fallback-salt";
  return crypto
    .createHash("sha256")
    .update(salt + ":" + ip)
    .digest("hex");
}

export interface CastVoteInput {
  voterUserId: string;
  contestantId: string;
  ip: string | null;
}

export interface CastVoteResult {
  /** True on first vote of the round; false if the voter had already voted
   *  for this contestant in this round (idempotent — we don't surface "you
   *  voted twice", we just no-op). */
  firstTime: boolean;
  totalForContestant: number;
  roundNumber: number;
}

export async function castVote(input: CastVoteInput): Promise<CastVoteResult> {
  const round = await getSetting("voting_round");
  const id = "v_" + crypto.randomBytes(8).toString("hex");
  const ipHash = hashIp(input.ip);

  // ON CONFLICT DO NOTHING returns a row only if a new row was inserted.
  const inserted = await queryOne<{ inserted: number }>(
    `INSERT INTO votes (id, voter_user_id, contestant_id, round_number, ip_hash)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (voter_user_id, contestant_id, round_number) DO NOTHING
     RETURNING 1 AS inserted`,
    [id, input.voterUserId, input.contestantId, round, ipHash]
  );

  const total = await countVotesForContestant(input.contestantId, round);
  return {
    firstTime: !!inserted,
    totalForContestant: total,
    roundNumber: round,
  };
}

export async function countVotesForContestant(
  contestantId: string,
  roundNumber: number
): Promise<number> {
  const r = await queryOne<{ n: number }>(
    `SELECT COUNT(*)::int AS n
       FROM votes
      WHERE contestant_id = ? AND round_number = ?`,
    [contestantId, roundNumber]
  );
  return r?.n ?? 0;
}

export async function userHasVoted(
  voterUserId: string,
  contestantId: string,
  roundNumber: number
): Promise<boolean> {
  const r = await queryOne<{ n: number }>(
    `SELECT 1 AS n FROM votes
     WHERE voter_user_id = ? AND contestant_id = ? AND round_number = ?`,
    [voterUserId, contestantId, roundNumber]
  );
  return !!r;
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  contestantId: string;
  displayName: string;
  category: string;
  city: string;
  votes: number;
}

export async function tallyByContestant(opts: {
  roundNumber: number;
  category?: string;
  limit?: number;
}): Promise<LeaderboardEntry[]> {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const params: unknown[] = [opts.roundNumber];
  let categoryFilter = "";
  if (opts.category) {
    categoryFilter = "AND c.category = ?";
    params.push(opts.category);
  }
  const rows = await query<{
    contestant_id: string;
    full_name: string;
    stage_name: string | null;
    category: string;
    city: string;
    votes: number;
  }>(
    `SELECT
        c.id          AS contestant_id,
        u.full_name,
        c.stage_name,
        c.category,
        c.city,
        COALESCE(v.n, 0)::int AS votes
       FROM contestants c
       JOIN users u ON u.id = c.user_id
       LEFT JOIN (
         SELECT contestant_id, COUNT(*)::int AS n
           FROM votes
          WHERE round_number = ?
          GROUP BY contestant_id
       ) v ON v.contestant_id = c.id
      WHERE c.withdrawn_at IS NULL
        AND EXISTS (
          SELECT 1 FROM submissions s
           WHERE s.contestant_id = c.id AND s.status = 'approved'
        )
        ${categoryFilter}
      ORDER BY votes DESC, c.created_at ASC
      LIMIT ${limit}`,
    params
  );

  return rows.map((r) => ({
    contestantId: r.contestant_id,
    displayName:
      r.stage_name ||
      r.full_name
        .split(" ")
        .map((p) => p[0]?.toUpperCase())
        .filter(Boolean)
        .slice(0, 2)
        .join(".") + ".",
    category: r.category,
    city: r.city,
    votes: r.votes,
  }));
}

export interface CategoryTally {
  category: string;
  votes: number;
}

export async function tallyByCategory(
  roundNumber: number
): Promise<CategoryTally[]> {
  const rows = await query<{ category: string; n: number }>(
    `SELECT c.category, COUNT(v.*)::int AS n
       FROM votes v
       JOIN contestants c ON c.id = v.contestant_id
      WHERE v.round_number = ?
      GROUP BY c.category
      ORDER BY n DESC`,
    [roundNumber]
  );
  return rows.map((r) => ({ category: r.category, votes: r.n }));
}

// ─── Anti-fraud: top IPs by vote count in a round ───────────────────────────

export interface SuspiciousIp {
  ipHash: string;
  votes: number;
  firstSeen: string;
  lastSeen: string;
}

export async function topVotingIps(
  roundNumber: number,
  limit = 50
): Promise<SuspiciousIp[]> {
  const rows = await query<{
    ip_hash: string;
    n: number;
    first_seen: string;
    last_seen: string;
  }>(
    `SELECT ip_hash,
            COUNT(*)::int AS n,
            MIN(created_at) AS first_seen,
            MAX(created_at) AS last_seen
       FROM votes
      WHERE round_number = ? AND ip_hash IS NOT NULL
      GROUP BY ip_hash
      HAVING COUNT(*) > 1
      ORDER BY n DESC
      LIMIT ${Math.min(Math.max(limit, 1), 200)}`,
    [roundNumber]
  );
  return rows.map((r) => ({
    ipHash: r.ip_hash,
    votes: r.n,
    firstSeen: r.first_seen,
    lastSeen: r.last_seen,
  }));
}

export async function listVotesForVoter(opts: {
  voterUserId: string;
  roundNumber: number;
}): Promise<VoteRow[]> {
  return query<VoteRow>(
    `SELECT * FROM votes
      WHERE voter_user_id = ? AND round_number = ?
      ORDER BY created_at DESC`,
    [opts.voterUserId, opts.roundNumber]
  );
}
