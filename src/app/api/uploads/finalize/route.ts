import { z } from "zod";
import { ok, parseJson, route } from "@/lib/api";
import { ApiError, getUserById, requireRole } from "@/lib/auth";
import {
  createSubmission,
  getContestantByUserId,
  getLatestSubmissionForSlot,
} from "@/lib/contestants";
import { submissionToDTO } from "@/lib/dto";
import { hasPaidSubmissionFee } from "@/lib/payments";
import {
  fetchCloudinaryVideo,
  validateAuditionVideo,
} from "@/lib/uploads";

export const runtime = "nodejs";

/**
 * Finalize a Cloudinary direct-upload by creating the corresponding
 * `submissions` row. We do **not** trust client-supplied metadata: we
 * re-fetch the resource from Cloudinary's Admin API using server-side
 * credentials, then validate against the audition constraints.
 *
 * If the contestant already has a non-superseded submission, this call
 * supersedes it (legacy take is marked `superseded` inside the createSubmission
 * transaction).
 */
const Body = z.object({
  publicId: z.string().min(3).max(200),
  title: z.string().min(2).max(120),
  category: z.enum([
    "rap",
    "singing",
    "songwriter",
    "performance",
    "instruments",
    "other",
  ]),
  // Phase 13: which slot this upload fills. 'main' is the competition entry,
  // extras are optional supplementary videos for referees.
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

  const data = await parseJson(req, Body);

  // Authoritative metadata fetch — never trust the client.
  const resource = await fetchCloudinaryVideo(data.publicId).catch((e) => {
    throw new ApiError(
      400,
      `Could not verify Cloudinary upload: ${
        e instanceof Error ? e.message : String(e)
      }`
    );
  });

  // The intent we issued embedded the contestant ID under `brs/<id>/...`. If
  // the public_id doesn't match, the upload was for a different contestant —
  // refuse to attach it.
  if (!resource.public_id.startsWith(`brs/${c.id}/`)) {
    throw new ApiError(
      403,
      "This upload doesn't belong to your contestant ID."
    );
  }

  const validation = validateAuditionVideo(resource);
  if (!validation.ok) {
    throw new ApiError(422, validation.reason);
  }

  const slot = data.slot ?? "main";
  // Only supersede the prior take in the *same* slot — re-uploading an
  // extra mustn't replace the competition video and vice-versa.
  const prior = await getLatestSubmissionForSlot(c.id, slot);

  const sub = await createSubmission({
    contestantId: c.id,
    title: data.title,
    category: data.category,
    videoUrl: resource.secure_url,
    cloudinaryPublicId: resource.public_id,
    format: resource.format,
    sizeBytes: resource.bytes,
    width: resource.width,
    height: resource.height,
    durationSec: Math.round(resource.duration),
    supersedesId: prior?.id ?? null,
    slot,
  });

  return ok({ submission: submissionToDTO(sub) }, { status: 201 });
});
