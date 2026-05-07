/**
 * Phase 7 (P7-T014): automated smoke harness for the J1 → J13 user journeys.
 *
 * Runs against a live dev server (default http://localhost:3000 or BASE env).
 * Logs in as the seeded admin + a fresh contestant, then walks every public
 * page and every key API endpoint, asserting status codes only — not full
 * functional behaviour. The goal is "did anything regress" rather than
 * "does feature X work in detail."
 *
 * Usage:
 *   npm run qa:smoke
 *
 * Exit code 0 if all checks pass, 1 otherwise. Prints a per-row table.
 */

import { Buffer } from "node:buffer";

try {
  process.loadEnvFile(".env.local");
} catch {
  // ignore — defaults will fall through
}

const BASE = process.env.BASE || "http://localhost:3000";

interface Check {
  label: string;
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  body?: unknown;
  expect: number | number[];
  cookieJar?: CookieJar;
  csrf?: boolean;
}

interface Result {
  label: string;
  pass: boolean;
  status: number;
  detail?: string;
}

type CookieJar = Map<string, string>;

function jarHeader(jar: CookieJar): string {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function hit(c: Check): Promise<Result> {
  const headers: Record<string, string> = {};
  if (c.cookieJar && c.cookieJar.size > 0) {
    headers.cookie = jarHeader(c.cookieJar);
  }
  if (c.body !== undefined) {
    headers["content-type"] = "application/json";
  }
  if (c.csrf !== false && c.method !== "GET") {
    headers["sec-fetch-site"] = "same-origin";
  }
  let status = 0;
  let detail: string | undefined;
  try {
    const res = await fetch(`${BASE}${c.path}`, {
      method: c.method,
      headers,
      body: c.body ? JSON.stringify(c.body) : undefined,
      redirect: "manual",
    });
    status = res.status;
    if (c.cookieJar) {
      const setCookies = res.headers.getSetCookie?.() ?? [];
      for (const sc of setCookies) {
        const m = sc.match(/^([^=]+)=([^;]+)/);
        if (m) c.cookieJar.set(m[1], m[2]);
      }
    }
    if (status >= 400) {
      const text = await res.text().catch(() => "");
      detail = text.slice(0, 180);
    }
  } catch (e) {
    detail = e instanceof Error ? e.message : String(e);
  }
  const expected = Array.isArray(c.expect) ? c.expect : [c.expect];
  return {
    label: c.label,
    status,
    pass: expected.includes(status),
    detail,
  };
}

async function main() {
  const results: Result[] = [];
  const adminJar: CookieJar = new Map();

  // J1 — public pages render
  const publicPaths = [
    "/",
    "/about",
    "/auditions",
    "/show-format",
    "/judges",
    "/categories",
    "/upload-guide",
    "/showcase",
    "/result-checker",
    "/faq",
    "/contact",
    "/login",
    "/register",
    "/forgot-password",
    "/terms",
    "/privacy",
    "/refund-policy",
    "/content-rights",
    "/contestants",
    "/audience/register",
    "/leaderboard",
    "/episodes",
    "/stage-performances",
    "/reels",
  ];
  for (const p of publicPaths) {
    results.push(await hit({ label: `public ${p}`, method: "GET", path: p, expect: 200 }));
  }
  results.push(
    await hit({
      label: "public /sitemap.xml",
      method: "GET",
      path: "/sitemap.xml",
      expect: 200,
    })
  );

  // J2 — anonymous /me returns null user envelope
  results.push(
    await hit({
      label: "anon GET /api/auth/me",
      method: "GET",
      path: "/api/auth/me",
      expect: 200,
    })
  );

  // J3 — admin login + session cookie
  if (process.env.SEED_ADMIN_EMAIL && process.env.SEED_ADMIN_PASSWORD) {
    results.push(
      await hit({
        label: "admin login",
        method: "POST",
        path: "/api/auth/login",
        body: {
          email: process.env.SEED_ADMIN_EMAIL,
          password: process.env.SEED_ADMIN_PASSWORD,
        },
        cookieJar: adminJar,
        expect: 200,
      })
    );
  } else {
    results.push({
      label: "admin login",
      pass: false,
      status: 0,
      detail: "SEED_ADMIN_* env vars not set; skipping admin-gated checks",
    });
  }

  if (adminJar.size > 0) {
    // J4 — admin GET endpoints
    const adminGets = [
      "/api/admin/contestants?status=active",
      "/api/admin/submissions",
      "/api/admin/messages",
      "/api/admin/audit-logs",
      "/api/admin/settings",
      "/api/admin/results?status=registered",
    ];
    for (const p of adminGets) {
      results.push(
        await hit({
          label: `admin ${p}`,
          method: "GET",
          path: p,
          cookieJar: adminJar,
          expect: 200,
        })
      );
    }

    // J5 — CSV export streams
    results.push(
      await hit({
        label: "admin csv export contestants",
        method: "GET",
        path: "/api/admin/exports?kind=contestants",
        cookieJar: adminJar,
        expect: 200,
      })
    );

    // J6 — settings PATCH writes audit
    results.push(
      await hit({
        label: "admin settings PATCH no-op",
        method: "PATCH",
        path: "/api/admin/settings",
        body: {},
        cookieJar: adminJar,
        expect: 200,
      })
    );

    // J7 — CSRF defence: cross-site PATCH must 403
    results.push(
      await hit({
        label: "csrf rejects cross-site PATCH",
        method: "PATCH",
        path: "/api/admin/settings",
        body: {},
        cookieJar: adminJar,
        csrf: false,
        expect: 403,
      })
    );

    // J8 — admin pages all 200 (HTML render gate)
    const adminPages = [
      "/admin",
      "/admin/contestants",
      "/admin/submissions",
      "/admin/assignments",
      "/admin/results",
      "/admin/payments",
      "/admin/messages",
      "/admin/exports",
      "/admin/settings",
      "/admin/audit-logs",
    ];
    for (const p of adminPages) {
      results.push(
        await hit({
          label: `admin page ${p}`,
          method: "GET",
          path: p,
          cookieJar: adminJar,
          expect: 200,
        })
      );
    }
  }

  // J9 — anonymous calls to admin APIs return 401
  for (const p of [
    "/api/admin/contestants",
    "/api/admin/audit-logs",
    "/api/admin/settings",
  ]) {
    results.push(
      await hit({
        label: `anon ${p} expect 401`,
        method: "GET",
        path: p,
        expect: 401,
      })
    );
  }

  // J10 — fresh contestant register + login + /me
  const ts = Date.now();
  const email = `qa-${ts}@example.com`;
  const password = `Qa-${Buffer.from(String(ts)).toString("base64").slice(0, 12)}!`;
  const contestantJar: CookieJar = new Map();
  results.push(
    await hit({
      label: "contestant register",
      method: "POST",
      path: "/api/auth/register",
      cookieJar: contestantJar,
      body: {
        fullName: "QA Smoke",
        email,
        password,
        phone: "+251911111111",
        age: 25,
        dob: "2001-01-01",
        city: "Addis Ababa",
        country: "ET",
        category: "singing",
        experience: "5+ years",
        bio: "QA smoke contestant — automated test row, please ignore.",
        agreedToRules: true,
        agreedToRights: true,
        agreedToAge: true,
      },
      expect: 201,
    })
  );

  // J11 — /me reflects the new contestant
  results.push(
    await hit({
      label: "contestant /api/auth/me",
      method: "GET",
      path: "/api/auth/me",
      cookieJar: contestantJar,
      expect: 200,
    })
  );

  // J12 — preferences round-trip
  results.push(
    await hit({
      label: "contestant GET /api/me/preferences",
      method: "GET",
      path: "/api/me/preferences",
      cookieJar: contestantJar,
      expect: 200,
    })
  );
  results.push(
    await hit({
      label: "contestant PATCH /api/me/preferences",
      method: "PATCH",
      path: "/api/me/preferences",
      cookieJar: contestantJar,
      body: { email_status_changes: false },
      expect: 200,
    })
  );

  // J13 — submissions blocked before email verification
  results.push(
    await hit({
      label: "submission blocked pre-verify (expect 403)",
      method: "POST",
      path: "/api/submissions",
      cookieJar: contestantJar,
      body: {
        title: "QA Smoke take 1",
        category: "singing",
        videoUrl: "https://example.com/qa.mp4",
      },
      expect: 403,
    })
  );

  // J14 — Phase 8 audience flows
  // Public directory + profile lookup of a known seeded contestant if any.
  results.push(
    await hit({
      label: "public GET /api/contestants",
      method: "GET",
      path: "/api/contestants",
      expect: 200,
    })
  );

  // Anonymous like must 401
  results.push(
    await hit({
      label: "anon POST /api/contestants/test/like (expect 401)",
      method: "POST",
      path: "/api/contestants/000000/like",
      expect: 401,
    })
  );

  // Audience register
  const audienceJar: CookieJar = new Map();
  const audienceEmail = `qa-fan-${ts}@example.com`;
  results.push(
    await hit({
      label: "audience register",
      method: "POST",
      path: "/api/auth/register-audience",
      cookieJar: audienceJar,
      body: {
        fullName: "QA Fan",
        email: audienceEmail,
        password,
      },
      expect: 201,
    })
  );

  // Audience comment without verifying email must 403
  results.push(
    await hit({
      label: "audience comment pre-verify (expect 403 or 404)",
      method: "POST",
      path: "/api/contestants/000000/comments",
      cookieJar: audienceJar,
      body: { body: "Looks great!" },
      expect: [403, 404],
    })
  );

  // Admin moderation queue
  if (adminJar.size > 0) {
    results.push(
      await hit({
        label: "admin GET /api/admin/moderation",
        method: "GET",
        path: "/api/admin/moderation",
        cookieJar: adminJar,
        expect: 200,
      })
    );
    results.push(
      await hit({
        label: "admin moderation page /admin/moderation",
        method: "GET",
        path: "/admin/moderation",
        cookieJar: adminJar,
        expect: 200,
      })
    );
    // J15 — Phase 9 admin voting surface
    results.push(
      await hit({
        label: "admin GET /api/admin/voting",
        method: "GET",
        path: "/api/admin/voting",
        cookieJar: adminJar,
        expect: 200,
      })
    );
    results.push(
      await hit({
        label: "admin voting page /admin/voting",
        method: "GET",
        path: "/admin/voting",
        cookieJar: adminJar,
        expect: 200,
      })
    );
  }

  // J16 — Phase 9 public leaderboard
  results.push(
    await hit({
      label: "public GET /api/leaderboard",
      method: "GET",
      path: "/api/leaderboard",
      expect: 200,
    })
  );

  // J17 — anonymous vote rejected
  results.push(
    await hit({
      label: "anon POST /api/contestants/000000/vote (expect 401 or 403)",
      method: "POST",
      path: "/api/contestants/000000/vote",
      expect: [401, 403],
    })
  );

  // Audience vote pre-verify must 403
  results.push(
    await hit({
      label: "audience vote pre-verify (expect 403 or 404)",
      method: "POST",
      path: "/api/contestants/000000/vote",
      cookieJar: audienceJar,
      expect: [403, 404],
    })
  );

  // J18 — Phase 10 episode surface
  results.push(
    await hit({
      label: "public GET /api/episodes",
      method: "GET",
      path: "/api/episodes",
      expect: 200,
    })
  );
  // Anonymous producer access must 401 (the PRODUCER routes require auth)
  results.push(
    await hit({
      label: "anon GET /api/producer/seasons (expect 401)",
      method: "GET",
      path: "/api/producer/seasons",
      expect: 401,
    })
  );
  // Contestant trying to hit producer endpoint must 403
  results.push(
    await hit({
      label: "contestant GET /api/producer/seasons (expect 403)",
      method: "GET",
      path: "/api/producer/seasons",
      cookieJar: contestantJar,
      expect: 403,
    })
  );
  // Admin can list seasons (admin is in the producer/admin allow-list)
  if (adminJar.size > 0) {
    results.push(
      await hit({
        label: "admin GET /api/producer/seasons",
        method: "GET",
        path: "/api/producer/seasons",
        cookieJar: adminJar,
        expect: 200,
      })
    );
  }

  // J19 — Phase 11 clips surface
  results.push(
    await hit({
      label: "public GET /api/clips",
      method: "GET",
      path: "/api/clips",
      expect: 200,
    })
  );
  results.push(
    await hit({
      label: "public GET /api/clips?kind=reel",
      method: "GET",
      path: "/api/clips?kind=reel",
      expect: 200,
    })
  );
  // Anonymous watchlist must 401
  results.push(
    await hit({
      label: "anon GET /api/me/watchlist (expect 401)",
      method: "GET",
      path: "/api/me/watchlist",
      expect: 401,
    })
  );
  // Audience can read its own (empty) watchlist
  results.push(
    await hit({
      label: "audience GET /api/me/watchlist",
      method: "GET",
      path: "/api/me/watchlist",
      cookieJar: audienceJar,
      expect: 200,
    })
  );
  // Anonymous producer clip publish must 401
  results.push(
    await hit({
      label: "anon GET /api/producer/clips (expect 401)",
      method: "GET",
      path: "/api/producer/clips",
      expect: 401,
    })
  );
  // Admin can read producer clips list
  if (adminJar.size > 0) {
    results.push(
      await hit({
        label: "admin GET /api/producer/clips",
        method: "GET",
        path: "/api/producer/clips",
        cookieJar: adminJar,
        expect: 200,
      })
    );
  }

  // ─── Print results ──────────────────────────────────────────────────────────
  const pad = (s: string, n: number) =>
    s.length > n ? s.slice(0, n - 1) + "…" : s.padEnd(n);
  const passN = results.filter((r) => r.pass).length;
  const total = results.length;
  // eslint-disable-next-line no-console
  console.log(`\nQA smoke against ${BASE}\n${"─".repeat(60)}`);
  for (const r of results) {
    // eslint-disable-next-line no-console
    console.log(
      `${r.pass ? "PASS" : "FAIL"}  ${pad(r.label, 50)}  ${String(
        r.status
      ).padStart(3)}${r.detail && !r.pass ? "  " + r.detail : ""}`
    );
  }
  // eslint-disable-next-line no-console
  console.log(`${"─".repeat(60)}\n${passN}/${total} passed.\n`);
  process.exit(passN === total ? 0 : 1);
}

void main();
