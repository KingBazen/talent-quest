import { ok, route } from "@/lib/api";
import { ApiError, readSession } from "@/lib/auth";
import { getContestantById, getLatestSubmissionForContestant } from "@/lib/contestants";
import {
  countFollowers,
  countLikes,
  listComments,
  userHasLiked,
  userIsFollowing,
} from "@/lib/engagement";
import { getSetting } from "@/lib/settings";
import {
  countVotesForContestant,
  userHasVoted,
} from "@/lib/voting";
import { queryOne } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Phase 8 (P8-T004): public contestant profile.
 *
 * Returns the public-safe view of a contestant: stage name (or initials),
 * city, category, status, latest approved submission video (if any), like /
 * follower counts, recent comments. If the requester is signed in as audience,
 * we also include `myLiked` / `myFollowing` so the UI can render toggled state
 * without a second round-trip.
 *
 * Anonymisation contract: NEVER returns full_name, email, phone, DOB. The
 * comment list does include each commenter's display name (since they wrote
 * it themselves and want to be seen).
 */

export const GET = route(async (req, ctx: { params: { id: string } }) => {
  const id = ctx.params.id;
  const c = await getContestantById(id);
  if (!c) throw new ApiError(404, "Contestant not found");
  if (c.withdrawn_at) throw new ApiError(404, "Contestant not found");

  const userRow = await queryOne<{ full_name: string }>(
    `SELECT full_name FROM users WHERE id = ?`,
    [c.user_id]
  );

  const displayName =
    c.stage_name ||
    (userRow?.full_name ?? "")
      .split(" ")
      .map((p) => p[0]?.toUpperCase())
      .filter(Boolean)
      .slice(0, 2)
      .join(".") + ".";

  const latestSubmission = await getLatestSubmissionForContestant(id);
  const submission =
    latestSubmission && latestSubmission.status === "approved"
      ? {
          id: latestSubmission.id,
          title: latestSubmission.title,
          videoUrl: latestSubmission.video_url,
          thumbnailUrl: latestSubmission.thumbnail_url ?? null,
          durationSec: latestSubmission.duration_sec,
          createdAt: latestSubmission.created_at,
        }
      : null;

  const round = await getSetting("voting_round");
  const votingOpen = await getSetting("voting_open");

  const [likes, followers, comments, votes] = await Promise.all([
    countLikes(id),
    countFollowers(id),
    listComments({ contestantId: id, limit: 50 }),
    countVotesForContestant(id, round),
  ]);

  const session = await readSession();
  let myLiked = false;
  let myFollowing = false;
  let myVoted = false;
  if (session) {
    [myLiked, myFollowing, myVoted] = await Promise.all([
      userHasLiked(session.sub, id),
      userIsFollowing(session.sub, id),
      userHasVoted(session.sub, id, round),
    ]);
  }

  return ok({
    contestant: {
      id: c.id,
      displayName,
      city: c.city,
      category: c.category,
      status: c.status,
      bio: c.bio,
      experience: c.experience,
    },
    submission,
    engagement: {
      likes,
      followers,
      myLiked,
      myFollowing,
      votes,
      myVoted,
      votingOpen,
      round,
    },
    comments: comments.map((c) => ({
      id: c.id,
      authorDisplay: c.author_full_name
        .split(" ")
        .slice(0, 2)
        .join(" "),
      authorRole: c.author_role,
      body: c.body,
      flagCount: c.flag_count,
      status: c.status,
      createdAt: c.created_at,
    })),
  });
});
