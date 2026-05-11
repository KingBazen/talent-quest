import { z } from "zod";
import { ok, parseJson, route } from "@/lib/api";
import {
  ApiError,
  createSession,
  getUserByEmail,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";
import { queryOne, type UserRow } from "@/lib/db";
import { getContestantByUserId } from "@/lib/contestants";
import {
  decrementRateLimit,
  enforceRateLimit,
  ipFromRequest,
} from "@/lib/rate-limit";

export const runtime = "nodejs";

const Body = z.object({
  // Phase 13: contestants can sign up with phone-only, so the login form
  // accepts either an email address or a phone number in this field. The
  // server-side splitter below picks the right lookup. Field name stays
  // `email` for mobile-client backwards compatibility.
  email: z.string().min(1, "Enter your phone or email"),
  password: z.string().min(1),
  /**
   * Phase 12 (P12-T001): mobile clients pass `audience: "mobile"` to receive
   * the JWT in the response body and skip the cookie. Cookie-based web
   * auth is unaffected. Defaults to "web".
   */
  audience: z.enum(["web", "mobile"]).optional(),
});

/**
 * Look a user up by email if the identifier looks like an email; otherwise
 * normalize to digits and match the contestants.phone column. We deliberately
 * do not fall through both lookups for every request — a phone-shaped string
 * with an `@` is never an email, and vice versa.
 */
async function findUserForLogin(identifier: string): Promise<UserRow | undefined> {
  const trimmed = identifier.trim();
  if (trimmed.includes("@")) {
    return getUserByEmail(trimmed);
  }
  const digits = trimmed.replace(/\D+/g, "");
  if (!digits) return undefined;
  // Match either the digits-only canonical form or the original stored
  // string, since contestants.phone preserves whatever the user typed.
  return queryOne<UserRow>(
    `SELECT u.* FROM users u
       JOIN contestants c ON c.user_id = u.id
      WHERE regexp_replace(c.phone, '\\D', '', 'g') = ?
      LIMIT 1`,
    [digits]
  );
}

// 10 failed attempts per 15 minutes per IP. We count up-front and roll back
// on success so a real user with the right password isn't penalised by their
// previous typos.
const LOGIN_LIMIT = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

export const POST = route(async (req: Request) => {
  const ip = ipFromRequest(req);
  await enforceRateLimit({
    bucket: "auth.login",
    identifier: ip,
    limit: LOGIN_LIMIT,
    windowMs: LOGIN_WINDOW_MS,
  });

  const { email, password, audience } = await parseJson(req, Body);
  const user = await findUserForLogin(email);
  if (!user) throw new ApiError(401, "Invalid login or password");
  const okPw = await verifyPassword(password, user.password_hash);
  if (!okPw) throw new ApiError(401, "Invalid login or password");

  // Withdrawn contestants cannot log in — return the same 401 message as a
  // bad password so a withdrawal isn't externally enumerable.
  if (user.role === "contestant") {
    const contestant = await getContestantByUserId(user.id);
    if (contestant?.withdrawn_at) {
      throw new ApiError(401, "Invalid login or password");
    }
  }

  // Successful login — give the slot back so legitimate users can keep typing.
  decrementRateLimit({ bucket: "auth.login", identifier: ip });

  const session = await createSession({
    sub: user.id,
    role: user.role,
    email: user.email,
  });

  const userPayload = {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    role: user.role,
  };

  // Mobile flow: return the JWT in the body so the app can store it in
  // SecureStore and send it as Authorization: Bearer on subsequent requests.
  // Skip the cookie — there's no browser to read it. Web flow stays
  // cookie-only (token is never exposed to the response body) so a malicious
  // browser extension or DOM-injected script can't read it.
  if (audience === "mobile") {
    return ok({
      user: userPayload,
      token: session.token,
      expiresAt: session.expires.toISOString(),
    });
  }

  await setSessionCookie(session.token, session.expires);
  return ok({ user: userPayload });
});
