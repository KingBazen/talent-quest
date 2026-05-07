import { ok, route } from "@/lib/api";
import { ApiError, requireRole } from "@/lib/auth";
import { getContestantByUserId } from "@/lib/contestants";
import { hasPaidSubmissionFee } from "@/lib/payments";
import {
  AUDITION_CONSTRAINTS,
  createUploadIntent,
  uploadsAreLive,
} from "@/lib/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Issue a signed Cloudinary direct-upload payload. The browser uses the
 * returned `uploadUrl` + `formFields` to POST the file directly to
 * Cloudinary — bytes never touch this server.
 *
 * Returns 503 when Cloudinary isn't configured so the client can fall back
 * to the URL-paste flow without crashing.
 */
export const GET = route(async () => {
  const session = await requireRole("contestant");
  const c = await getContestantByUserId(session.sub);
  if (!c) throw new ApiError(404, "No contestant profile");
  if (c.withdrawn_at) throw new ApiError(403, "Account withdrawn");

  // Submission-fee gate: registration is free, but uploading a video requires
  // a successful payment (wallet checkout or admin-approved bank transfer).
  if (!(await hasPaidSubmissionFee(c.id))) {
    throw new ApiError(
      402,
      "Pay the audition fee before uploading. Open the payment modal from the upload guide."
    );
  }

  if (!uploadsAreLive()) {
    throw new ApiError(
      503,
      "Direct upload is not configured. Use the URL-paste fallback or contact support."
    );
  }

  const intent = createUploadIntent({ contestantId: c.id });
  return ok({
    intent,
    constraints: AUDITION_CONSTRAINTS,
  });
});
