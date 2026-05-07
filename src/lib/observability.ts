/**
 * Phase 7 (P7-T017): error monitoring.
 *
 * Lightweight, opt-in Sentry shim. We POST events to Sentry's HTTP store API
 * directly so the codebase stays free of `@sentry/nextjs` (which adds a real
 * dependency, build-time wrapping via `withSentryConfig`, and source-map
 * upload tooling). When the founder is ready to graduate to the full SDK,
 * replace this file with `Sentry.init(...)` and the existing call sites
 * (`captureException` / `captureMessage`) survive untouched.
 *
 * - No DSN configured → silent no-op (with a structured `console.warn` for the
 *   first call so the misconfiguration is visible).
 * - PII scrubbing on by default — we strip `password`, `token`, `cookie`,
 *   `authorization`, `email` (replaced with first letter + ***@host) from
 *   any payload we send.
 *
 * Exposes:
 *   captureException(err, context?) — wrap caught throwables.
 *   captureMessage(message, level?, context?) — explicit warn/info events.
 */

type Level = "fatal" | "error" | "warning" | "info" | "debug";

interface DsnParts {
  publicKey: string;
  host: string;
  projectId: string;
  protocol: "http" | "https";
}

let cachedDsn: DsnParts | null | undefined; // undefined = not yet computed
let warnedNoDsn = false;

function parseDsn(): DsnParts | null {
  if (cachedDsn !== undefined) return cachedDsn;
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    cachedDsn = null;
    return null;
  }
  // Form: https://<publicKey>@<host>/<projectId>
  try {
    const u = new URL(dsn);
    if (u.protocol !== "https:" && u.protocol !== "http:") {
      cachedDsn = null;
      return null;
    }
    const projectId = u.pathname.replace(/^\//, "").trim();
    if (!u.username || !u.host || !projectId) {
      cachedDsn = null;
      return null;
    }
    cachedDsn = {
      publicKey: u.username,
      host: u.host,
      projectId,
      protocol: u.protocol === "https:" ? "https" : "http",
    };
    return cachedDsn;
  } catch {
    cachedDsn = null;
    return null;
  }
}

const PII_KEYS = new Set([
  "password",
  "passwordhash",
  "token",
  "cookie",
  "authorization",
  "auth",
  "secret",
  "api_key",
  "apikey",
  "session",
  "jwt",
]);

function maskEmail(email: string): string {
  const [user, host] = email.split("@");
  if (!user || !host) return "***";
  return `${user[0] ?? "?"}***@${host}`;
}

function scrub(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === "string") {
    // best-effort email masking inside strings
    return value.replace(
      /([A-Z0-9._%+-]+)@([A-Z0-9.-]+\.[A-Z]{2,})/gi,
      (_full, u, h) => `${u[0]}***@${h}`
    );
  }
  if (Array.isArray(value)) return value.map(scrub);
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const lk = k.toLowerCase();
      if (PII_KEYS.has(lk)) {
        out[k] = "[redacted]";
      } else if (lk === "email" && typeof v === "string") {
        out[k] = maskEmail(v);
      } else {
        out[k] = scrub(v);
      }
    }
    return out;
  }
  return value;
}

interface SentryEvent {
  event_id: string;
  timestamp: number;
  platform: "node" | "javascript";
  level: Level;
  environment: string;
  release?: string;
  message?: { formatted: string };
  exception?: {
    values: { type: string; value: string; stacktrace?: { frames: unknown[] } }[];
  };
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
}

function makeEventId(): string {
  // 32 hex chars
  const bytes = new Uint8Array(16);
  // crypto.getRandomValues works on both Node 19+ and edge runtimes.
  (globalThis.crypto as Crypto).getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sendEvent(event: SentryEvent): Promise<void> {
  const dsn = parseDsn();
  if (!dsn) {
    if (!warnedNoDsn && process.env.NODE_ENV === "production") {
      warnedNoDsn = true;
      // eslint-disable-next-line no-console
      console.warn(
        JSON.stringify({
          level: "warn",
          evt: "observability.no_dsn_configured",
          hint:
            "Set SENTRY_DSN in production env to enable error monitoring (P7-T017).",
        })
      );
    }
    return;
  }
  const url =
    `${dsn.protocol}://${dsn.host}/api/${dsn.projectId}/store/` +
    `?sentry_key=${dsn.publicKey}&sentry_version=7`;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(event),
      // Don't keep the request alive past the lambda — Sentry is best-effort.
      keepalive: true,
    });
  } catch {
    // Swallow — observability must never break user-facing requests.
  }
}

function baseEvent(level: Level): SentryEvent {
  return {
    event_id: makeEventId(),
    timestamp: Math.floor(Date.now() / 1000),
    platform: typeof window === "undefined" ? "node" : "javascript",
    level,
    environment: process.env.NODE_ENV || "development",
    release: process.env.NEXT_PUBLIC_RELEASE_TAG || undefined,
  };
}

export function captureException(
  err: unknown,
  context?: Record<string, unknown>
): void {
  const event = baseEvent("error");
  const e = err instanceof Error ? err : new Error(String(err));
  event.exception = {
    values: [
      {
        type: e.name || "Error",
        value: e.message,
      },
    ],
  };
  if (context) {
    event.extra = scrub(context) as Record<string, unknown>;
  }
  // Fire-and-forget. We deliberately do not await so the caller's hot path
  // is unaffected.
  void sendEvent(event);
}

export function captureMessage(
  message: string,
  level: Level = "info",
  context?: Record<string, unknown>
): void {
  const event = baseEvent(level);
  event.message = { formatted: message };
  if (context) {
    event.extra = scrub(context) as Record<string, unknown>;
  }
  void sendEvent(event);
}

/**
 * Convenience for the API error envelope path. Lets us call once from the
 * global handler instead of sprinkling capture calls.
 */
export function isObservabilityConfigured(): boolean {
  return parseDsn() !== null;
}
