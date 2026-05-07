import { z } from "zod";
import { ok, parseJson, route } from "@/lib/api";
import { ApiError } from "@/lib/auth";
import { consumeVerificationToken } from "@/lib/email-verification";
import { exec } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Phase 7 (P7-T012): consume an email-verification token.
 *
 * Sets users.email_verified_at if the token is valid + unused + unexpired.
 * Returns the same shape on every response so this endpoint can't be used
 * as a token-existence oracle.
 */

const Body = z.object({
  token: z.string().min(20).max(200),
});

export const POST = route(async (req: Request) => {
  const { token } = await parseJson(req, Body);
  const userId = await consumeVerificationToken(token);
  if (!userId) {
    throw new ApiError(400, "This verification link is invalid or has expired");
  }
  await exec(
    `UPDATE users SET email_verified_at = (CURRENT_TIMESTAMP::text) WHERE id = ?`,
    [userId]
  );
  return ok({ verified: true });
});
