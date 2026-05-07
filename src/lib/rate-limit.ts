import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { ApiError } from "./auth";

/**
 * Two-mode rate limiter.
 *
 * Upstash mode (production):
 *   When `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are both set,
 *   requests are counted in a shared Upstash Redis instance. This is what we
 *   want on Vercel: every serverless lambda hits the same counter, so the
 *   limit is global per bucket.
 *
 * In-memory mode (dev fallback):
 *   When the env vars are not set, we count in a process-local `Map`. Fine on
 *   a single Node process (local dev / Codespaces / a single-instance VM),
 *   but counters do NOT cross instance boundaries. Never deploy to multi-
 *   instance production with this fallback active.
 *
 * The `enforceRateLimit` API is **async** because Upstash is async. Callers
 * must `await` it. The fallback path also returns a Promise (resolved sync)
 * so callers don't have to branch.
 */

interface InMemoryCounter {
  count: number;
  resetAt: number; // ms epoch
}

const memStore = new Map<string, InMemoryCounter>();

if (typeof setInterval !== "undefined" && process.env.NODE_ENV !== "test") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, c] of memStore) {
      if (c.resetAt <= now) memStore.delete(key);
    }
  }, 60_000).unref?.();
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSec: number;
  /** Backend that handled this request (useful for tests / debugging). */
  backend: "upstash" | "memory";
}

export interface RateLimitConfig {
  /** Bucket name, e.g. "auth.login" — keeps independent counters separate. */
  bucket: string;
  /** Per-IP / per-user identifier. */
  identifier: string;
  /** Max attempts allowed inside the window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

// ─── Upstash backend ─────────────────────────────────────────────────────────
//
// The `Ratelimit` constructor wants a duration string and a token count baked
// in, so each (limit, windowMs) combination needs its own instance. We cache
// them in a Map keyed by `${limit}:${windowMs}` so we don't rebuild on every
// request.

let cachedRedis: Redis | null | undefined; // undefined = not yet checked
const limiterCache = new Map<string, Ratelimit>();

function getRedis(): Redis | null {
  if (cachedRedis !== undefined) return cachedRedis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    cachedRedis = null;
    return null;
  }
  cachedRedis = new Redis({ url, token });
  return cachedRedis;
}

function durationFor(windowMs: number): `${number} ms` | `${number} s` | `${number} m` | `${number} h` {
  // Upstash's Duration parser accepts "ms", "s", "m", "h" with a space. Choose
  // the largest unit that yields an integer to keep the analytics sensible.
  if (windowMs % 3_600_000 === 0) return `${windowMs / 3_600_000} h` as const;
  if (windowMs % 60_000 === 0) return `${windowMs / 60_000} m` as const;
  if (windowMs % 1000 === 0) return `${windowMs / 1000} s` as const;
  return `${windowMs} ms` as const;
}

function getUpstashLimiter(limit: number, windowMs: number): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;

  const key = `${limit}:${windowMs}`;
  let lim = limiterCache.get(key);
  if (!lim) {
    lim = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, durationFor(windowMs)),
      prefix: "tq:rl",
      // Per-instance LRU in front of Redis. Upstash returns blocked decisions
      // from local cache without a network round-trip once a key is rate-
      // limited — saves cost + latency under attack.
      ephemeralCache: new Map(),
    });
    limiterCache.set(key, lim);
  }
  return lim;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Increment-and-check. Returns `ok: false` once the limit is exceeded.
 * Does NOT throw — call `enforceRateLimit()` if you want a 429 response.
 */
export async function checkRateLimit(cfg: RateLimitConfig): Promise<RateLimitResult> {
  const upstash = getUpstashLimiter(cfg.limit, cfg.windowMs);
  if (upstash) {
    const r = await upstash.limit(`${cfg.bucket}:${cfg.identifier}`);
    const now = Date.now();
    return {
      ok: r.success,
      remaining: r.remaining,
      resetAt: r.reset,
      retryAfterSec: r.success ? 0 : Math.max(0, Math.ceil((r.reset - now) / 1000)),
      backend: "upstash",
    };
  }

  // In-memory fallback.
  const key = `${cfg.bucket}:${cfg.identifier}`;
  const now = Date.now();
  const existing = memStore.get(key);

  if (!existing || existing.resetAt <= now) {
    const fresh: InMemoryCounter = { count: 1, resetAt: now + cfg.windowMs };
    memStore.set(key, fresh);
    return {
      ok: true,
      remaining: cfg.limit - 1,
      resetAt: fresh.resetAt,
      retryAfterSec: 0,
      backend: "memory",
    };
  }

  existing.count += 1;
  const exceeded = existing.count > cfg.limit;
  return {
    ok: !exceeded,
    remaining: Math.max(0, cfg.limit - existing.count),
    resetAt: existing.resetAt,
    retryAfterSec: exceeded ? Math.ceil((existing.resetAt - now) / 1000) : 0,
    backend: "memory",
  };
}

/** Throws ApiError(429) when the limit is exceeded. Use inside route handlers. */
export async function enforceRateLimit(cfg: RateLimitConfig): Promise<RateLimitResult> {
  const r = await checkRateLimit(cfg);
  if (!r.ok) {
    throw new ApiError(
      429,
      `Too many requests — try again in ${r.retryAfterSec}s`
    );
  }
  return r;
}

/**
 * Roll back a previously-counted request. Used on the login path so a
 * successful login doesn't penalise the user for prior typos.
 *
 * **Only honoured by the in-memory backend.** With Upstash, sliding-window
 * counts cannot be retroactively decremented without breaking the algorithm,
 * so this is a no-op there. The semantic difference is acceptable: production
 * counts every login attempt against the limit (slightly stricter), dev
 * counts only failures (more forgiving for typo-prone humans).
 */
export function decrementRateLimit(
  cfg: Pick<RateLimitConfig, "bucket" | "identifier">
): void {
  if (getRedis()) return; // Upstash: no-op
  const key = `${cfg.bucket}:${cfg.identifier}`;
  const existing = memStore.get(key);
  if (existing && existing.count > 0) existing.count -= 1;
}

/**
 * Best-effort client IP extraction from a Next.js Request.
 *
 * Vercel + most reverse proxies populate `x-forwarded-for`. We take the first
 * entry (the original client). Falls back to `x-real-ip` and finally to the
 * literal string `"unknown"`. We never trust unauthenticated client headers
 * for anything more sensitive than rate-limit bucketing.
 */
export function ipFromRequest(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const xri = req.headers.get("x-real-ip");
  if (xri) return xri.trim();
  return "unknown";
}

/** Reset all in-memory counters (test-only). Does not touch Upstash. */
export function _resetRateLimitStoreForTests(): void {
  memStore.clear();
  limiterCache.clear();
  cachedRedis = undefined;
}
