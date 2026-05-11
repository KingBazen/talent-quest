import { z } from "zod";
import { ok, parseJson, route } from "@/lib/api";
import { ApiError, getUserById, requireRole } from "@/lib/auth";
import {
  createSubmission,
  getContestantByUserId,
  getLatestSubmissionForSlot,
  listSubmissionsForContestant,
} from "@/lib/contestants";
import { submissionToDTO } from "@/lib/dto";
import { hasPaidSubmissionFee } from "@/lib/payments";
import { uploadsAreLive } from "@/lib/uploads";

export const runtime = "nodejs";

/**
 * URL-paste fallback for audition submission. Used when:
 *   • Cloudinary is not configured for this environment, or
 *   • the contestant has trouble with the direct upload (covered by the
 *     "Trouble uploading?" disclosure in the dashboard).
 *
 * Cloudinary uploads land at `POST /api/uploads/finalize` instead.
 */
const PostBody = z.object({
  title: z.string().min(2).max(120),
  category: z.enum([
    "rap",
    "singing",
    "songwriter",
    "performance",
    "instruments",
    "other",
  ]),
  videoUrl: z.string().url(),
  thumbnailUrl: z.string().url().optional().nullable(),
  durationSec: z.number().int().min(1).max(7200).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  // Phase 13: 'main' is the competition entry, 'extra_1' / 'extra_2' are
  // optional supplementary videos. Defaults to 'main' for backward compat.
  slot: z.enum(["main", "extra_1", "extra_2"]).optional(),
});

export const POST = route(async (req: Request) => {
  const session = await requireRole("contestant");
  const c = await getContestantByUserId(session.sub);
  if (!c) throw new ApiError(404, "No contestant profile");
  if (c.withdrawn_at) throw new ApiError(403, "Account withdrawn");

  // P7-T012: gate the registered -> submitted transition on email verification.
  const user = await getUserById(session.sub);
  if (!user?.email_verified_at) {
    throw new ApiError(
      403,
      "Verify your email before submitting. Check your inbox or request a new link from your dashboard."
    );
  }

  // Submission-fee gate: only paid contestants may publish a submission.
  if (!(await hasPaidSubmissionFee(c.id))) {
    throw new ApiError(
      402,
      "Pay the audition fee before submitting your video."
    );
  }

  const data = await parseJson(req, PostBody);
  const slot = data.slot ?? "main";

  // Replace-submission flow: only supersede a prior submission in the *same*
  // slot. Re-uploading an extra shouldn't blow away the main competition
  // video and vice versa.
  const prior = await getLatestSubmissionForSlot(c.id, slot);

  const sub = await createSubmission({
    contestantId: c.id,
    title: data.title,
    category: data.category,
    videoUrl: data.videoUrl,
    thumbnailUrl: data.thumbnailUrl,
    durationSec: data.durationSec,
    notes: data.notes,
    supersedesId: prior?.id ?? null,
    slot,
  });
  return ok({ submission: submissionToDTO(sub) }, { status: 201 });
});

export const GET = route(async () => {
  const session = await requireRole("contestant");
  const c = await getContestantByUserId(session.sub);
  if (!c) throw new ApiError(404, "No contestant profile");
  const items = (await listSubmissionsForContestant(c.id)).map(submissionToDTO);
  return ok({ items, uploadsAvailable: uploadsAreLive() });
});
