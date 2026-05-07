import { ok, route } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import {
  SUSPICIOUS_IP_THRESHOLD,
  tallyByCategory,
  tallyByContestant,
  topVotingIps,
} from "@/lib/voting";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Phase 9 (P9-T007): admin voting overview.
 *
 *   GET /api/admin/voting?round=N
 *
 * Returns the current voting state, top contestants this round, per-category
 * breakdown, and the suspicious-IP report (sha256-hashed IPs that have cast
 * more than 1 vote in the round). The threshold for "auto-flag" is shown so
 * the admin can correlate with the moderation queue.
 */

export const GET = route(async (req: Request) => {
  await requireRole("admin");
  const url = new URL(req.url);
  const round = Math.max(
    1,
    Number(url.searchParams.get("round") ?? "") ||
      (await getSetting("voting_round"))
  );
  const votingOpen = await getSetting("voting_open");

  const [items, byCategory, suspicious] = await Promise.all([
    tallyByContestant({ roundNumber: round, limit: 200 }),
    tallyByCategory(round),
    topVotingIps(round, 100),
  ]);

  return ok({
    round,
    votingOpen,
    suspiciousThreshold: SUSPICIOUS_IP_THRESHOLD,
    items,
    byCategory,
    suspicious,
  });
});
