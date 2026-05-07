import { z } from "zod";
import { ok, parseJson, route } from "@/lib/api";
import { ApiError, getUserById, requireRole } from "@/lib/auth";
import {
  createSubmission,
  getContestantByUserId,
  getLatestSubmissionForContestant,
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

  // Replace-submission flow: if there's a non-superseded prior, mark it
  // superseded as part of the same transaction in createSubmission.
  const prior = await getLatestSubmissionForContestant(c.id);

  const sub = await createSubmission({
    contestantId: c.id,
    title: data.title,
    category: data.category,
    videoUrl: data.videoUrl,
    thumbnailUrl: data.thumbnailUrl,
    durationSec: data.durationSec,
    notes: data.notes,
    supersedesId: prior?.id ?? null,
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
