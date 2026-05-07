import { z } from "zod";
import { ok, parseJson, route } from "@/lib/api";
import { ApiError, getUserById, readSession } from "@/lib/auth";
import { getContestantById } from "@/lib/contestants";
import { listComments, postComment } from "@/lib/engagement";
import { enforceRateLimit } from "@/lib/rate-limit";
import { recordAudit } from "@/lib/audit-logs";
import { notifyContestantOfComment } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Phase 8 (P8-T007): public comments on a contestant.
 *
 * GET  → newest 50 visible comments
 * POST → adds a comment; rate-limited 5/min/user; requires email-verified
 *        account (matches the submission gate — keeps drive-by spam down)
 */

export const GET = route(async (_req, ctx: { params: { id: string } }) => {
  const c = await getContestantById(ctx.params.id);
  if (!c || c.withdrawn_at) throw new ApiError(404, "Contestant not found");
  const items = await listComments({ contestantId: ctx.params.id, limit: 50 });
  return ok({
    items: items.map((c) => ({
      id: c.id,
      authorDisplay: c.author_full_name.split(" ").slice(0, 2).join(" "),
      authorRole: c.author_role,
      body: c.body,
      flagCount: c.flag_count,
      status: c.status,
      createdAt: c.created_at,
    })),
  });
});

const PostBody = z.object({
  body: z
    .string()
    .min(1, "Comment can't be empty")
    .max(800, "Comment too long (max 800 chars)"),
});

export const POST = route(async (req, ctx: { params: { id: string } }) => {
  const session = await readSession();
  if (!session) throw new ApiError(401, "Sign in to comment");

  const c = await getContestantById(ctx.params.id);
  if (!c || c.withdrawn_at) throw new ApiError(404, "Contestant not found");

  // Anti-spam: must be email-verified to post. Re-uses the same gate that
  // blocks contestant submission.
  const author = await getUserById(session.sub);
  if (!author?.email_verified_at) {
    throw new ApiError(403, "Verify your email before posting comments");
  }

  // 5/min/user. Bucket on user_id (not IP) so a crowded coffee shop isn't
  // collectively shut up.
  await enforceRateLimit({
    bucket: "comment.post",
    identifier: `${session.sub}`,
    limit: 5,
    windowMs: 60_000,
  });

  const data = await parseJson(req, PostBody);

  // Cheap heuristic: collapse repeat-character spam (aaaaaaaaa > 10 in a row).
  const collapsed = data.body.replace(/(.)\1{9,}/g, "$1$1$1");
  // Reject body that's >50% non-alphanumeric (excluding common punctuation).
  const normalized = collapsed.trim();
  const noisyChars = (normalized.match(/[^\w\s.,!?'":;()\-]/g) ?? []).length;
  if (
    normalized.length > 30 &&
    noisyChars / Math.max(normalized.length, 1) > 0.5
  ) {
    throw new ApiError(
      422,
      "Comment looks like noise — try plain words and basic punctuation"
    );
  }

  const row = await postComment({
    contestantId: ctx.params.id,
    authorUserId: session.sub,
    body: normalized,
  });

  // Light-touch audit so admins can see who commented when (matches the
  // append-only audit pattern from Phase 6).
  await recordAudit({
    actorUserId: session.sub,
    targetType: "comment",
    targetId: row.id,
    action: "comment.create",
    payload: { contestant_id: ctx.params.id },
  });

  // Notify the contestant — best-effort, doesn't block the response.
  try {
    const display = author.full_name.split(" ").slice(0, 2).join(" ");
    await notifyContestantOfComment({
      contestantUserId: c.user_id,
      commenterDisplay: display,
      commentExcerpt: normalized,
      contestantId: c.id,
    });
  } catch {
    // best-effort
  }

  return ok({
    comment: {
      id: row.id,
      body: row.body,
      status: row.status,
      flagCount: row.flag_count,
      createdAt: row.created_at,
    },
  });
});
