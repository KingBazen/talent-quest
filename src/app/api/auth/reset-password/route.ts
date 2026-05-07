import { z } from "zod";
import { ok, parseJson, route } from "@/lib/api";
import { ApiError, hashPassword } from "@/lib/auth";
import { exec } from "@/lib/db";
import {
  findValidToken,
  hashToken,
  markTokenUsed,
} from "@/lib/password-reset";
import { enforceRateLimit, ipFromRequest } from "@/lib/rate-limit";

export const runtime = "nodejs";

const Body = z.object({
  token: z.string().min(20).max(200),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});

// 10 attempts per 15 min per IP. Tighter than login because a forged
// reset-token attack should be quickly throttled.
const RESET_LIMIT = 10;
const RESET_WINDOW_MS = 15 * 60 * 1000;

export const POST = route(async (req: Request) => {
  const ip = ipFromRequest(req);
  await enforceRateLimit({
    bucket: "auth.reset-password",
    identifier: ip,
    limit: RESET_LIMIT,
    windowMs: RESET_WINDOW_MS,
  });

  const { token, password } = await parseJson(req, Body);
  const row = await findValidToken(token);
  if (!row) {
    throw new ApiError(
      400,
      "This reset link is invalid or has expired. Request a new one from the forgot-password page."
    );
  }

  // Atomic: mark token used first so a race can't double-spend it. If the
  // update returns 0 rows, another concurrent request beat us to it.
  const consumed = await markTokenUsed(hashToken(token));
  if (consumed === 0) {
    throw new ApiError(400, "This reset link has already been used.");
  }

  // Update the password.
  const newHash = await hashPassword(password);
  await exec(
    `UPDATE users SET password_hash = ? WHERE id = ?`,
    [newHash, row.user_id]
  );

  return ok({
    reset: true,
    message: "Password updated. You can now sign in with the new password.",
  });
});
