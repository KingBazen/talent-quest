import { ok, route } from "@/lib/api";
import { ApiError, getUserById, readSession } from "@/lib/auth";
import { getContestantById, getLatestSubmissionForContestant } from "@/lib/contestants";
import { getSetting } from "@/lib/settings";
import { castVote, SUSPICIOUS_IP_THRESHOLD, topVotingIps } from "@/lib/voting";
import { recordAudit } from "@/lib/audit-logs";
import { recordModerationAction } from "@/lib/engagement";
import { enforceRateLimit, ipFromRequest } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * Phase 9 (P9-T003): cast a public fan vote.
 *
 * Gates (in order):
 *   - voting_open in settings must be true
 *   - signed-in user
 *   - email-verified user (anti-bot — same gate as commenting)
 *   - per-IP rate-limit: 10/h
 *   - per-user rate-limit: 5/h (a verified email is cheap; this caps a
 *     single account from carpet-bombing multiple contestants)
 *   - target contestant must have at least one approved submission
 *   - composite-unique index enforces one-vote-per-contestant-per-round
 *
 * Anti-fraud (P9-T008): after every successful insert we check the suspicious
 * IP threshold for the current round. If breached, we write an audit row +
 * a moderation_action so the admin voting page surfaces it.
 *
 * Idempotency: re-voting for the same contestant in the same round is a no-op
 * (returns the same payload), not an error. This kills double-tap UI bugs.
 */

export const POST = route(async (req, ctx: { params: { id: string } }) => {
  const votingOpen = await getSetting("voting_open");
  if (!votingOpen) {
    throw new ApiError(403, "Voting is closed for this round");
  }

  const session = await readSession();
  if (!session) throw new ApiError(401, "Sign in to vote");

  const user = await getUserById(session.sub);
  if (!user) throw new ApiError(401, "Sign in to vote");
  if (!user.email_verified_at) {
    throw new ApiError(
      403,
      "Verify your email before voting. Open the verify link in your inbox."
    );
  }

  const c = await getContestantById(ctx.params.id);
  if (!c || c.withdrawn_at) throw new ApiError(404, "Contestant not found");

  const latest = await getLatestSubmissionForContestant(ctx.params.id);
  if (!latest || latest.status !== "approved") {
    throw new ApiError(
      409,
      "This contestant doesn't have an approved submission to vote on yet"
    );
  }

  const ip = ipFromRequest(req);
  await enforceRateLimit({
    bucket: "vote.ip",
    identifier: ip,
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });
  await enforceRateLimit({
    bucket: "vote.user",
    identifier: session.sub,
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });

  const result = await castVote({
    voterUserId: session.sub,
    contestantId: ctx.params.id,
    ip,
  });

  if (result.firstTime) {
    await recordAudit({
      actorUserId: session.sub,
      targetType: "contestant",
      targetId: ctx.params.id,
      action: "vote.cast",
      payload: { round: result.roundNumber, total_after: result.totalForContestant },
    });

    // P9-T008: anti-fraud heuristic.
    // After every insert, query the top IPs for this round. If the casting
    // IP just crossed the threshold, log + flag.
    try {
      const top = await topVotingIps(result.roundNumber, 200);
      for (const t of top) {
        if (t.votes === SUSPICIOUS_IP_THRESHOLD) {
          // Hit the threshold exactly — file once, not on every vote past it.
          await recordAudit({
            actorUserId: null,
            targetType: "contestant",
            targetId: ctx.params.id,
            action: "vote.suspicious_ip",
            reason: `IP cluster crossed ${SUSPICIOUS_IP_THRESHOLD} votes in round ${result.roundNumber}`,
            payload: {
              ip_hash: t.ipHash,
              votes: t.votes,
              first_seen: t.firstSeen,
              last_seen: t.lastSeen,
              round: result.roundNumber,
            },
          });
          await recordModerationAction({
            targetType: "submission",
            targetId: ctx.params.id,
            action: "report",
            actorUserId: null,
            reason: `Auto-flagged: IP cluster cast ${t.votes}+ votes in round ${result.roundNumber}`,
          });
        }
      }
    } catch (e) {
      // Anti-fraud must not break a successful vote. Log + move on.
      // eslint-disable-next-line no-console
      console.warn(
        JSON.stringify({
          level: "warn",
          evt: "vote.antifraud_failed",
          error: e instanceof Error ? e.message : "unknown",
        })
      );
    }
  }

  return ok({
    voted: true,
    firstTime: result.firstTime,
    total: result.totalForContestant,
    round: result.roundNumber,
  });
});
