# Bling Records Show — Technical Architecture Plan

> **Document type:** Technical reference for the full ecosystem.
> **Read first:** [current-product-ux-ecosystem-audit.md](current-product-ux-ecosystem-audit.md), [bling-records-show-mvp-ux-technical-scope.md](bling-records-show-mvp-ux-technical-scope.md), [full-development-roadmap.md](full-development-roadmap.md).
> **Sister docs:** [data-model-and-api-plan.md](data-model-and-api-plan.md), [admin-and-operations-plan.md](admin-and-operations-plan.md), [task-tracker.md](task-tracker.md), [agent-execution-rules.md](agent-execution-rules.md).
> **Status of code:** No application code is to be modified by the act of writing this doc.

---

## 1. Current Architecture Summary

Captured from the audit. Where the README disagrees with the code, the **code wins**.

| Layer | Current implementation |
| --- | --- |
| **Frontend** | Next.js 14.2.18 (App Router), React 18, TypeScript 5.6, Tailwind, shadcn/ui-style primitives over Radix, Framer Motion, `next-themes`. |
| **Backend** | Next.js Route Handlers under `/api/*` (Node runtime). Thin pattern: `route()` wrapper, `parseJson(req, ZodSchema)`, `ok()` / `err()` envelope. |
| **Database** | Postgres on **Neon serverless** via [@neondatabase/serverless](../package.json) + `ws`. Lazy pool, idempotent migrations in [src/lib/db.ts](../src/lib/db.ts). 8 tables today. |
| **Auth** | bcryptjs (cost 10) + jose HS256 JWT, HTTP-only `tq_session` cookie, 14-day TTL. |
| **RBAC** | Edge middleware ([src/middleware.ts](../src/middleware.ts)) for `/admin` and `/referee`; per-API `requireRole()` checks for everything else. |
| **Media** | Cloudinary signed direct-upload **intent** signed server-side ([src/lib/uploads.ts](../src/lib/uploads.ts)). **Client wiring is missing.** Local-fallback route is referenced but missing. |
| **Payments** | AdmasPay / Telebirr ([src/lib/payments.ts](../src/lib/payments.ts)) with three runtime modes: full API, hosted-checkout, stub. HMAC-verified webhook. Stub redirect target `/payments/mock` is missing. |
| **Chatbot** | EN/AM static FAQ matcher with optional Anthropic Haiku 4.5 fallthrough ([src/app/api/chatbot/route.ts](../src/app/api/chatbot/route.ts)). |
| **Hosting target** | Vercel ([vercel.json](../vercel.json)); `next.config.mjs` marks `@neondatabase/serverless`, `ws`, `bcryptjs` as external server packages. |
| **Build tooling** | `npm run dev / build / start / lint / type-check`, plus DB scripts (`db:init`, `db:seed`, `db:reset`). |
| **Promo videos** | Standalone Remotion subproject under [videos/](../videos) producing 3 aspect-ratio promo MP4s. |

---

## 2. Recommended Full Architecture

### 2.1 Logical view

```
                    ┌─────────────────────────────────────────────┐
                    │              CLIENTS                         │
                    │  Web (Next.js)  │  Mobile (Flutter, Phase 12)│
                    │  Admin / Referee / Producer dashboards       │
                    └──────────────┬──────────────────────────────┘
                                   │ HTTPS + Secure cookie / Bearer (mobile)
                    ┌──────────────▼──────────────┐
                    │   Edge layer (Vercel Edge)   │
                    │   - middleware.ts (RBAC)     │
                    │   - rate-limit (Upstash)     │
                    │   - cache (ISR for marketing)│
                    └──────────────┬──────────────┘
                                   │
              ┌────────────────────▼──────────────────────┐
              │          Next.js Route Handlers           │
              │     /api/auth, /api/contestants,          │
              │     /api/submissions, /api/scores,        │
              │     /api/admin/*, /api/referee/*,         │
              │     /api/payments/*, /api/chatbot, ...    │
              └──┬─────────┬─────────┬──────────┬─────────┘
                 │         │         │          │
   ┌─────────────▼┐ ┌──────▼────┐ ┌──▼─────────┐ ┌▼────────────┐
   │ Neon Postgres │ │ Cloudinary│ │ AdmasPay /  │ │ Anthropic   │
   │ (pooled)      │ │ video API │ │ Telebirr API│ │ Messages API│
   └───────────────┘ └───────────┘ └────────────┘ └─────────────┘
                 │
        ┌────────▼────────────┐
        │  Background workers │  (Phase 11+: clip processing, notifications,
        │  (Vercel Cron / Q)  │   audit-log fan-out, anti-fraud scoring)
        └─────────────────────┘
```

### 2.2 Frontend

- **Stack:** Next.js 14 App Router, TypeScript, Tailwind, shadcn/ui primitives.
- **Rendering strategy:**
  - Marketing pages (`/`, `/about`, `/auditions`, etc.) — **Static / ISR** (good Lighthouse + CDN cacheable).
  - Auth pages — **dynamic SSR** (cookie-aware).
  - Contestant / referee / admin pages — **dynamic SSR** with `force-dynamic` for session-aware routes.
  - Public APIs (`/api/contestants/[id]`, `/api/showcase`) — `force-dynamic` for now; can move to revalidated cache later.
- **State management:** keep light. `SessionProvider` context for auth; per-page `useState` for page-local UI; React Query / SWR introduced only when needed (audience listing in Phase 8 is the candidate).
- **Forms:** RHF + Zod (existing). Same Zod schema shared between client and server via a `shared/` folder *(introduce only when copy-paste becomes annoying)*.
- **Component system:** continue with shadcn/ui-style primitives in [src/components/ui](../src/components/ui). Do **not** introduce a second component library.

### 2.3 Backend / API

- **Pattern:** Next.js Route Handlers in `src/app/api/**/route.ts`. Keep the existing `route()` wrapper + Zod `parseJson` discipline.
- **Versioning:** stay unversioned for MVP. Introduce `/api/v1/*` only when Phase 12 (mobile) ships, and only for endpoints mobile depends on. Web continues to consume the unversioned tree.
- **Runtime:** Node runtime on every API route (existing `runtime = "nodejs"`); `dynamic = "force-dynamic"` on session and auth endpoints (existing).
- **Background work:**
  - Phase 7: transactional emails — synchronous via the email provider’s SDK.
  - Phase 11+: introduce **Vercel Cron** for scheduled jobs (clip backfill, daily KPI snapshot).
  - Phase 14+: introduce a real queue (e.g., Upstash QStash, Inngest, or Cloudflare Queues) for clip transcoding triggers, notification fan-out, anti-fraud post-processing.

### 2.4 Database

- **Engine:** Postgres (Neon) — keep.
- **Pool:** lazy `getPool()` (existing). Reuse across hot reloads via `global.__tq_pool`.
- **Migrations:** idempotent `doMigrate()` runs once per process. **Strict rule:** every schema change is additive in one deploy and destructive in a later deploy. No rename-and-drop in the same release.
- **Seeds:** scripts/db-seed.ts. Seed data should NOT include real production credentials in any environment.
- **Backups:** Neon automatic snapshots (provider-managed). Document RTO / RPO in [SECURITY.md](SECURITY.md) by Phase 7.

### 2.5 File / media storage

- **MVP:** Cloudinary signed direct upload. Server signs intent; browser uploads file; server records metadata.
- **Phase 11:** evaluate Mux or Bunny CDN for HLS streaming. Cloudinary covers MVP + initial post-launch.
- **Local fallback:** drop the `/api/submissions/local-upload` reference (per Phase 1 cleanup) — Cloudinary is required.

### 2.6 Payments

- **Provider:** AdmasPay (hosted-checkout for MVP) → AdmasPay/Telebirr API for full automation.
- **Webhook:** existing HMAC verify (`x-telebirr-signature`).
- **Modes:** keep all three modes (`api`, `checkout`, `stub`). Stub mode must either be backed by a real `/payments/mock` page or removed entirely.
- **Reconciliation:** admin override + manual reconciliation flow. Add daily Cron job to flag `pending` payments older than 24 h.

### 2.7 Authentication

- **MVP:** existing bcrypt + JWT.
- **Mobile (Phase 12):** introduce refresh-token flow; access tokens short-lived (15 min), refresh tokens 30 days, refresh-token rotation.
- **OAuth (future):** consider Google / Apple Sign-In for the audience layer (Phase 8) to lower friction.

### 2.8 Admin tools

- See [admin-and-operations-plan.md](admin-and-operations-plan.md) for full breakdown. Architecturally: same Next.js app, separate route tree under `/admin/*`, same auth + RBAC.

### 2.9 Notifications

- **MVP (Phase 7):** transactional email via Postmark or Resend (recommend Postmark for deliverability in EM/EU).
- **Phase 12:** push via Firebase Cloud Messaging + APNs.
- **Phase 14:** SMS via Africa’s Talking or Telebirr SMS — only after explicit approval.

### 2.10 Analytics

- **MVP:** server-emitted events written to `audit_logs` + lightweight KPI aggregation in `/admin/dashboard`.
- **Phase 7:** Plausible or PostHog for client analytics (privacy-respecting).
- **Phase 14:** dedicated analytics warehouse if data volume warrants (BigQuery / ClickHouse) — only when Plausible / PostHog hits limits.

### 2.11 CDN

- **MVP:** Vercel Edge Network handles static + ISR caching.
- **Phase 11:** add a media CDN tier in front of the streaming provider (Cloudflare or Bunny CDN).

### 2.12 Monitoring

- **MVP:** Vercel logs + minimal `console.error`. Treat logs as not-secret-safe.
- **Phase 7:** add Sentry for error monitoring (frontend + backend), with PII scrubbing.
- **Phase 11+:** uptime checks (Better Stack / UptimeRobot) on `/api/healthz` once that endpoint exists.

### 2.13 Logging

- **Server:** structured JSON logs with `console.log`/`console.error` — Vercel ingests them.
- **Audit log:** the `audit_logs` table is a **product feature**, not just a debugging tool. Read by admins, immutable from the application.

### 2.14 Future mobile API support

- **Contract:** publish a stable v1 API contract at `/api/v1/*` (Phase 12).
- **Auth:** refresh-token flow (above).
- **Versioning:** breaking changes always go to `/api/v2/*`; old version supported for 90 days minimum.

---

## 3. Environment Strategy

| Environment | Purpose | Hosting | DB | Cloudinary | AdmasPay |
| --- | --- | --- | --- | --- | --- |
| **Local** | Day-to-day dev | localhost | Neon (dev branch) or local Postgres | dev cloud / unsigned preset | stub mode |
| **Preview** | PR review | Vercel Preview | Neon (preview branch) | dev cloud | stub or sandbox |
| **Staging** | Pre-prod QA (introduced Phase 7) | Vercel | Neon (staging branch) | staging | sandbox |
| **Production** | Live | Vercel | Neon (main) | production | production |

### Secrets management

- **Single rule:** real secrets live only in the host’s env-var UI (Vercel → Project → Settings → Environment Variables). Never in any committed file.
- `.env.example` lists keys with placeholder values only.
- `.env.local` is for local development only and `.gitignore`’d (Phase 0 task).
- For preview branches, configure each branch with a per-branch DB URL (Neon supports branched databases natively).

### Required env vars

| Var | Purpose | Required where |
| --- | --- | --- |
| `JWT_SECRET` | HS256 signing | All envs |
| `DATABASE_URL` | Postgres connection | All envs |
| `NEXT_PUBLIC_SITE_URL` | Absolute links | All envs |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | DB seed | Local only |
| `SEED_REFEREE_EMAIL` / `SEED_REFEREE_PASSWORD` | DB seed | Local only |
| `ADMASPAY_CHECKOUT_URL` | Hosted-checkout link | Preview, Staging, Production (when live) |
| `TELEBIRR_*` | Full API mode | Production (Phase 4 expansion) |
| `CLOUDINARY_*` | Media upload | All envs once Phase 3 lands |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` | LLM chatbot | Optional, all envs |
| `EMAIL_PROVIDER_API_KEY` | Notifications | Phase 7+ |
| `SENTRY_DSN` | Error tracking | Phase 7+ |

---

## 4. Hosting and Deployment

| Component | Provider | Notes |
| --- | --- | --- |
| **Web app** | Vercel | Existing target. Edge middleware works out of the box. |
| **Database** | Neon Postgres | Pooled connection string for the app; direct for migrations / introspection. |
| **Media upload + delivery** | Cloudinary | MVP. Move clips to Mux / Bunny in Phase 11. |
| **Payment processing** | AdmasPay (Telebirr) | Use hosted-checkout for MVP, add full API in Phase 4. |
| **Email** | Postmark or Resend | Phase 7. |
| **CDN (media)** | Cloudflare or Bunny CDN | Phase 11. |
| **Streaming** | Mux or Cloudinary HLS or Bunny CDN | Phase 11 evaluation. |
| **Mobile push** | Firebase + APNs | Phase 12. |
| **SMS** | Africa’s Talking / Telebirr | Phase 14, optional. |
| **Background jobs** | Vercel Cron (Phase 11) → Inngest / QStash (Phase 14) | Avoid running long jobs in route handlers. |

### Deploy flow

- `main` branch → production deploy on Vercel.
- Every PR → Vercel preview deploy with branched DB.
- Migrations are idempotent and run on first request after deploy (`ensureMigrated()`); for destructive migrations, run them via the `db:reset` / a new `db:migrate` script before flipping traffic.

---

## 5. Security Architecture

Distillation of [SECURITY.md](SECURITY.md), the audit, and the MVP scope §16.

| Layer | Control | Phase |
| --- | --- | --- |
| Identity | bcrypt(10), HS256 JWT, HTTP-only cookies, 14-day TTL, `Secure`+`SameSite=Lax`, optional `__Host-` prefix in prod | Existing (rotate creds Phase 0) |
| RBAC | Edge middleware on page tree; `requireRole(...)` on every privileged API | Existing |
| Authorization scope | Contestant: own data only; Referee: assigned only; Admin: all; Super-admin (Phase 14): can manage admins | Existing → Phase 6 → Phase 14 |
| Rate-limiting | `/api/auth/login` (10 / 15 min / IP), `/api/contestants/[id]` (30 / 5 min / IP), `/api/auth/forgot-password` (< 3 / 5 min / email) | Phase 0–2 |
| CSRF | Double-submit token or `Sec-Fetch-Site` check on `/api/*` mutations | Phase 6 |
| Webhook | HMAC SHA-256 with timing-safe compare | Existing |
| Upload validation | Cloudinary metadata cross-check (format, size, duration, resolution) | Phase 3 |
| Private data protection | Public `result-checker` returns initials + status only; full PII for logged-in self / admin | Phase 0 (immediate), Phase 6 (refined) |
| Audit logs | `audit_logs` table; written on every status change, payment override, role change, mod action | Phase 6 |
| Backup + restore | Neon snapshots; document RTO / RPO; quarterly drill | Phase 7 |
| Sentry | Error monitoring with PII scrubbing | Phase 7 |
| Vulnerability scanning | `npm audit` in CI; Snyk / GH Dependabot on a weekly cadence | Phase 7 |
| Penetration test | One external pentest before Phase 8 launch | Pre-Phase-8 |

---

## 6. Scalability Plan

### 6.1 Video upload scaling

- Direct upload to Cloudinary keeps the application server out of the upload path — already linear scalable.
- Bottleneck = Cloudinary plan + bandwidth at the user end. Plan for 5 × peak audition rate when sizing.

### 6.2 Streaming costs

- **Cost driver:** GB delivered.
- **Budget approach:** put a CDN tier in front of the streaming provider (Phase 11) and cache short clips aggressively.
- **Bunny CDN** is typically cheapest for EM/EU; Mux is most full-featured.
- **Adaptive bitrate** is mandatory by Phase 11; serving 1080p source files to 3G mobile users is unacceptable.

### 6.3 Database scaling

- Neon scales reads automatically; writes are constrained by primary node size.
- Indexes already exist for `contestants(category, city, status)`, `submissions(contestant_id, status)`, `payments(contestant_id, status)`. Add indexes for `audit_logs(created_at)`, `submission_assignments(referee_user_id)`, `votes(round_id, audience_user_id)` as those tables land.
- For Phase 9+ vote storms: write-only buffer table + nightly materialised view aggregation.

### 6.4 CDN

- Marketing pages: Vercel Edge handles cacheable rendering.
- Public showcase / contestant pages: ISR with `revalidate: 60` and on-demand revalidation when admin changes status.
- Media: provider CDN + (Phase 11) edge CDN tier.

### 6.5 Background jobs

- **Phase 7:** transactional email — synchronous, short-running, at-most-once.
- **Phase 11:** Vercel Cron for daily KPI snapshot, clip backfill, payment cleanup.
- **Phase 14:** real queue for fan-out (notifications), heavy compute (anti-fraud), and event-driven workflows.

### 6.6 Cache strategy

- **Public read endpoints** (e.g., `/api/showcase`): Vercel cache with `revalidate` and on-demand purge.
- **Per-user reads** (`/api/auth/me`, `/api/submissions`): no cache.
- **Static assets**: Cloudflare / Vercel Edge.

---

## 7. Future Mobile Architecture (Phase 12)

### 7.1 Stack choice

- **Recommendation: Flutter.** Single codebase for iOS + Android, mature camera / file pickers, decent dev experience, good performance for a content-heavy app.
- Alternatives: React Native (familiar to web team) or native Swift+Kotlin (highest quality, most cost).

### 7.2 API contract

- Stable `/api/v1/*` endpoints. Schemas frozen for v1; breaking changes require v2.
- DTOs shared via OpenAPI spec generated from Zod (introduce `zod-to-openapi` in Phase 12).

### 7.3 Auth flow

- Refresh-token flow:
  - Access token (JWT, 15 min, HS256, `aud=mobile`).
  - Refresh token (opaque, 30 days, server-stored, rotated on every refresh).
- Endpoints:
  - `POST /api/v1/auth/login` → `{ accessToken, refreshToken, user }`
  - `POST /api/v1/auth/refresh` → `{ accessToken, refreshToken }`
  - `POST /api/v1/auth/logout` → invalidates the refresh token

### 7.4 Media upload from mobile

- Use Cloudinary mobile SDK with the same signed-intent endpoint.
- Pause / resume across app suspension.

### 7.5 Push notifications

- FCM for Android; APNs for iOS; abstracted by Firebase.
- Mobile app registers device token; server stores `device_tokens` table and fans out per topic.

### 7.6 Versioning

- Mobile sends `X-App-Version` header; server can soft-deprecate (force update) after support window.

---

## 8. Technical Debt

Compiled from the audit. Each item is tracked in [task-tracker.md](task-tracker.md) under its owning phase.

| Item | Severity | Impact | Recommended Fix | Phase |
| --- | --- | --- | --- | --- |
| Committed `.env.local` with real Neon + AdmasPay credentials | **Critical** | Full DB compromise possible; payment redirection possible | Phase 0 §0 of the MVP scope | 0 |
| Seeded credentials rendered on `/login` | **Critical** | Public admin/referee compromise in production | Hide in production builds | 0 |
| `/api/submissions/local-upload` referenced but missing | **High** | Runtime 404 as soon as Cloudinary fallback hits | Implement (dev-only) or remove | 1 / 3 |
| `/payments/mock` referenced in stub mode but missing | **High** | Runtime 404 if stub mode runs in any env | Implement (dev-only) or remove stub branch | 1 / 4 |
| README documents SQLite while code uses Postgres | **Medium** | Future devs follow wrong setup | Rewrite README | 1 |
| `data/talentquest.db*` SQLite leftovers | **Low** | Misleading repo state | Remove + `.gitignore` | 1 |
| `better-sqlite3` comment in `src/lib/dto-types.ts` | **Low** | Stale comment | Remove | 1 |
| Demo `Advance step` button + API on `/profile` | **High** | Lets contestants fake progress | Remove route + button | 1 |
| `/admin-demo` and `/referee-demo` redirects | **Low** | Vestigial routes | Remove | 1 |
| “Open round 2” admin no-op button | **Medium** | False expectation of round mgmt | Hide until Phase 10 | 1 |
| `/profile` Scores tab shows zeros even when scores exist | **Medium** | Misleads contestants | Wire to `aggregateScoresFor` | 2 |
| Public `/api/contestants/[id]` returns full name + 0 rate-limit | **High** | Brute-force PII leak | Limit + reduce returned fields | 0 |
| `/api/auth/login` no rate-limit | **High** | Password spray feasible | Rate-limit | 0 |
| No CSRF defence on cookie-auth POSTs | **Medium** | Cross-site form post abuse | Token / Sec-Fetch check | 6 |
| Referees see global queue, not assigned | **Medium** | Bias risk | Assignment table | 5 |
| Referee cannot approve / reject / flag a submission | **Medium** | Status field underused | New mutation endpoint | 5 |
| Scoring UI says “Update score” but flow is single-shot | **Low** | UX mismatch | Either confirm-edit flow or copy change | 5 |
| Fake Reels likes / shares (UI-only) | **Medium** | Trust risk | Remove in MVP; persisted in Phase 8 | 1 / 8 |
| Hardcoded testimonials / stats | **Medium** | Trust risk | Replace or remove | 1 |
| Footer publicly advertises `/admin`, `/referee` | **Low** | Pen-test surface | Remove from public footer | 1 |
| `/admin` Payments tab links to `/docs/PAYMENTS_TELEBIRR.md` (404) | **Low** | Dead link | Replace or remove | 6 |
| No notifications | **Medium** | Contestants miss status changes | Add transactional email | 7 |
| No edit-profile flow | **Medium** | FAQ promises this | Add | 2 |
| No password-reset flow | **High** | Locked-out users | Add | 2 |
| No legal pages | **Critical (legal)** | Cannot launch publicly | Add `/terms` + `/privacy` + `/refund-policy` | 7 |
| `muted-foreground` borderline contrast on dark mode | **Low** | A11y | Tighten HSL value | 1 |
| Range sliders in `/referee` lack `aria-labelledby` | **Low** | A11y | Add | 5 |

---

*End of Technical Architecture Plan.*
