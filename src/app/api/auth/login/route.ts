import { z } from "zod";
import { ok, parseJson, route } from "@/lib/api";
import {
  ApiError,
  createSession,
  getUserByEmail,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";
import { getContestantByUserId } from "@/lib/contestants";
import {
  decrementRateLimit,
  enforceRateLimit,
  ipFromRequest,
} from "@/lib/rate-limit";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  /**
   * Phase 12 (P12-T001): mobile clients pass `audience: "mobile"` to receive
   * the JWT in the response body and skip the cookie. Cookie-based web
   * auth is unaffected. Defaults to "web".
   */
  audience: z.enum(["web", "mobile"]).optional(),
});

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
  const user = await getUserByEmail(email);
  if (!user) throw new ApiError(401, "Invalid email or password");
  const okPw = await verifyPassword(password, user.password_hash);
  if (!okPw) throw new ApiError(401, "Invalid email or password");

  // Withdrawn contestants cannot log in — return the same 401 message as a
  // bad password so a withdrawal isn't externally enumerable.
  if (user.role === "contestant") {
    const contestant = await getContestantByUserId(user.id);
    if (contestant?.withdrawn_at) {
      throw new ApiError(401, "Invalid email or password");
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
