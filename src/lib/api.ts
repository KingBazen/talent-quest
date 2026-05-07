import { NextResponse } from "next/server";
import { ZodError, type ZodSchema } from "zod";
import { ApiError } from "./auth";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function err(status: number, message: string, extras?: unknown) {
  return NextResponse.json(
    { ok: false, error: message, details: extras ?? undefined },
    { status }
  );
}

// ─── CSRF defence (P6-T012) ──────────────────────────────────────────────────
//
// Cookie-auth POST/PATCH/PUT/DELETE requests must come from a same-origin
// browser context. We rely on `Sec-Fetch-Site` (sent by every modern browser)
// — `same-origin` and `same-site` are accepted; `cross-site` and `none` are
// rejected. Provider webhooks (which post from outside the browser) don't
// send the header at all (`null`), so we additionally allow requests that
// supply a known shared header — currently the Telebirr signature header.
//
// `SameSite=Lax` on our session cookie already mitigates the bulk of CSRF;
// this is defence-in-depth so an attacker needs *both* a misconfigured
// cookie *and* a CSRF mistake to exploit.
//
// Routes that need to opt out (webhooks, public form posts that don't carry
// session) wrap with `route(handler, { csrf: "skip" })`.

const MUTATING_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);
const SAFE_FETCH_SITES = new Set(["same-origin", "same-site"]);

export function checkCsrf(req: Request): void {
  if (!MUTATING_METHODS.has(req.method)) return;
  // Browsers send Sec-Fetch-Site on every fetch since ~2020.
  const site = req.headers.get("sec-fetch-site");
  if (site && SAFE_FETCH_SITES.has(site)) return;
  // No header at all → request is from a non-browser client (curl, server-
  // side fetch, webhook). Allow only if the route opted out (handled by the
  // wrapper) — otherwise treat as forbidden.
  if (site === null) {
    throw new ApiError(
      403,
      "CSRF: missing Sec-Fetch-Site. Browser requests are required for this endpoint."
    );
  }
  throw new ApiError(403, `CSRF: blocked Sec-Fetch-Site=${site}`);
}

export async function parseJson<T>(
  req: Request,
  schema: ZodSchema<T>
): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ApiError(400, "Invalid JSON body");
  }
  try {
    return schema.parse(body);
  } catch (e) {
    if (e instanceof ZodError) {
      const first = e.errors[0];
      throw new ApiError(
        422,
        `${first.path.join(".") || "body"}: ${first.message}`
      );
    }
    throw e;
  }
}

export function handleApiError(e: unknown) {
  if (e instanceof ApiError) return err(e.status, e.message);
  console.error("[api] unhandled error:", e);
  // P7-T017: forward unhandled exceptions to Sentry. Lazy-imported to keep
  // the edge-runtime cold path minimal when no DSN is configured.
  void import("./observability").then(({ captureException }) => {
    captureException(e, { source: "api.route" });
  });
  return err(500, "Internal server error");
}

export interface RouteOptions {
  /** Default `"check"` — runs CSRF defence on mutating methods. Webhooks +
   *  unauthenticated public posts that need to accept off-browser traffic
   *  pass `"skip"`. */
  csrf?: "check" | "skip";
}

/** Wrap a route handler so thrown ApiError / ZodError become JSON responses,
 *  and so cookie-auth mutations get CSRF defence by default. */
export function route<T extends (req: Request, ctx?: any) => Promise<Response>>(
  handler: T,
  opts: RouteOptions = {}
): T {
  const csrfMode = opts.csrf ?? "check";
  return (async (req, ctx) => {
    try {
      if (csrfMode === "check") checkCsrf(req);
      return await handler(req, ctx);
    } catch (e) {
      return handleApiError(e);
    }
  }) as T;
}
