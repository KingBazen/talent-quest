# Security, Backup, and Recovery — The Bling Records Show

> **Part 1** below is the original security architecture plan (threat model + per-area mitigations) — aspirational targets that guide the long-term roadmap.
> **Part 2** (added Phase 7, P7-T018) is the **operational runbook**: backup, restore, RTO/RPO, secret rotation, incident response.

---

## Part 1 — Security requirements (architectural plan)

## Threat model (top 10)

1. **Account takeover** — credential stuffing, weak passwords, OTP brute force.
2. **Unauthorized scoring** — judge or admin tokens leaking, IDOR on scores.
3. **Payment fraud** — replayed callbacks, forged HMAC, double-spend refunds.
4. **Video tampering / leaks** — direct CDN downloads of unpublished clips.
5. **PII exposure** — contestant phone/email leaked through APIs or logs.
6. **DDoS / cost amplification** — submission upload abuse, chatbot spam.
7. **XSS / CSRF** — bio fields, judge notes, contact form.
8. **Insecure direct object references** — `/api/v1/contestants/:id` exposing
   another user.
9. **Supply-chain compromise** — malicious npm dependency in build.
10. **Insider misuse** — admin user altering scores after publish.

## Mitigations

### Authentication

- Argon2id for password hashing, 64 MB memory cost.
- Rate-limit login (5/min/IP, 10/hour/email).
- OTP: 6 digits, 5-minute TTL, max 5 attempts per code, max 3 codes/hour/phone.
- JWT access tokens 15 min; refresh tokens are opaque, rotating, hashed in DB.
- 2FA (TOTP) enforced for `judge` and `admin` roles.
- Session list per user with revoke-all action.

### Authorization

- Server enforces RBAC on every endpoint via middleware. Tokens carry the role
  but the server re-checks against the DB row on each request.
- Object-level access checks for every contestant/submission/score lookup.
- Public projections explicitly remove `email`, `phone`, `dob`, internal ids.

### Payments

- HMAC signature on every callback verified against the aggregator's secret;
  payload also re-fetched from the aggregator to confirm status.
- Idempotency table (`payments.provider_ref` UNIQUE) prevents double credit.
- Refunds require admin role + 2FA challenge + audit-log entry.
- Reconciliation cron at 02:00 daily flags discrepancies.

### Video pipeline

- Upload URLs are short-lived (15 min) and bound to the contestant's session.
- Transcoder webhooks validated with provider HMAC.
- Unpublished clips are served only via signed playlist URLs that expire in
  5 min and are bound to the requester's user agent / IP family.
- Watermarking optional for grand-final clips.

### Data protection

- TLS 1.3 only. HSTS enabled with preload after 60-day grace.
- Database: encryption at rest, TDE, encrypted automated backups.
- PII fields (`phone`, `email`, `password_hash`, `totp_secret`) encrypted at
  rest with the managed provider's KMS.
- Logs scrub email, phone, and tokens at the logger middleware. Stack traces
  never leak PII.
- Personal data is deletable on contestant request; aggregate analytics are
  anonymized within 30 days.

### Application security

- All inputs validated with Zod / class-validator on the server.
- Output sanitized at the React layer; rich-text fields rendered through
  DOMPurify before display.
- CSRF: SameSite=Lax cookies + double-submit token for non-GET requests.
- Content Security Policy: `default-src 'self'`, allow video provider CDN,
  scripts from `'self'` and the analytics vendor, inline scripts disallowed.
- Subresource integrity on third-party scripts.
- `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`.

### Abuse prevention

- Cloudflare / Vercel firewall in front of API.
- Per-IP and per-account rate limits on login, OTP, upload-URL, chat.
- File upload guardrails: MIME sniffing, max size, magic-byte check, virus
  scan via ClamAV or provider-side scanning.

### Supply chain

- `npm ci` with locked versions in CI.
- Renovate / Dependabot weekly PRs; automated security review with `npm
  audit --omit=dev` and OSV scan.
- `pnpm` or `npm` package overrides for known-bad transitive deps.
- SLSA Level 2 build provenance for production deploys.

### Insider controls

- Admin actions on scores/payments require 2FA challenge per session.
- Read-only DB access for analysts; production write access gated by ticketed
  approval.
- Audit log is append-only at the application layer; rows cannot be edited or
  deleted from the API. DB-level revocation on `UPDATE`/`DELETE` for the API
  user on the `audit_logs` table.

### Incident response

- On-call rotation with PagerDuty.
- Runbooks for: payment outage, video provider outage, DB failover, leaked
  secret rotation, suspected breach.
- Post-incident reviews within 5 business days; public status page for sev-1.

---

## Part 2 — Operational runbook (Phase 7, P7-T018)

> Owner: Bling Records DevOps lead (founder until that role is filled).
> Review cadence: every 90 days, or after any production incident.

### 2.1 Recovery objectives

| Objective | Target | What it means in practice |
| --- | --- | --- |
| **RPO** — Recovery Point Objective | ≤ 5 minutes | Up to 5 minutes of writes can be lost on a database failure. Neon's branch + point-in-time recovery exceeds this for normal operation. |
| **RTO** — Recovery Time Objective | ≤ 60 minutes | From "we have detected a total outage" to "the production site is taking traffic again." Includes recreating the Vercel deployment and re-pointing the Neon branch. |
| **MTTR** — median | ≤ 30 minutes | Most incidents are partial — a single failing endpoint, a stuck webhook, a Cloudinary 5xx — and resolve faster. |
| **Data retention** | 6 months post-season | After a season ends, contestant PII is anonymised; audit log retains pseudonymous pointers. See [/privacy](../src/app/privacy/page.tsx) §4. |

### 2.2 What we back up

| Asset | Storage | Backup mechanism | Restore source of truth |
| --- | --- | --- | --- |
| **Postgres** (users, contestants, submissions, payments, payment_events, audit_logs, notifications, scores, settings) | Neon serverless | Built-in **point-in-time recovery** — 7 days WAL by default; **daily branch snapshots** retained 30 days | Neon → Branches → Restore from snapshot or PITR timestamp |
| **Audition videos** | Cloudinary | Cloudinary's standard durability (versioned object storage). `submissions.cloudinary_public_id` lets us re-derive any URL even if a CDN edge fails | Cloudinary Console → Media Library → Restore |
| **Application code & config** | GitHub + Vercel deployment history | Git is the source of truth. Vercel keeps every deployment → "Promote to Production" is one click | GitHub `main` + Vercel deployments tab |
| **Secrets** (`JWT_SECRET`, `DATABASE_URL`, `TELEBIRR_HMAC_SECRET`, `CLOUDINARY_*`, `RESEND_API_KEY`/`POSTMARK_SERVER_TOKEN`, `UPSTASH_REDIS_*`, `SENTRY_DSN`) | Vercel env-var UI | Vercel preserves env vars across deployments. Founder maintains a sealed paper backup of the rotation log | 1Password / sealed envelope held by the founder |
| **Payment-provider records** | AdmasPay / Telebirr merchant dashboard | Held by provider. Our `payment_events` table mirrors every transaction we've seen so we can reconcile against the provider | AdmasPay merchant dashboard export |

We do **not** back up Cloudinary separately (already replicated) or server logs older than 24 h (the audit log is the canonical record for incident forensics).

### 2.3 Backup verification (quarterly drill)

1. **Neon PITR drill** — pick a timestamp 4 h in the past, restore to a throwaway branch, verify a known contestant ID + audit log entry from that moment is present. **Expected duration:** 10 min.
2. **Vercel rollback drill** — pick a previous deployment, "Promote to Production", verify `/` and `/api/auth/me` respond. Promote the current deployment back. **Expected duration:** 5 min.
3. **Cloudinary integrity check** — pull 5 random `submissions.cloudinary_public_id` values from the last week, hit the secure URL, confirm 200 + correct duration. **Expected duration:** 5 min.
4. **Secrets rotation drill** — rotate `JWT_SECRET` on a staging branch, verify pre-rotation cookies fail and post-rotation cookies succeed. **Expected duration:** 10 min.

Record each drill in `docs/incident-log.md` (create on first run) with date, operator, outcome. A red drill is a P1 incident with its own writeup.

### 2.4 Restore procedures

#### 2.4a "The database is gone"

1. Confirm in the Neon dashboard. If Neon is up and the project is intact, this is probably an application bug → skip to §2.4c.
2. Neon → **Branches** → identify `main`.
3. Click **Restore** → **Point-in-time** → set timestamp to "30 seconds before the first error spike" (cross-reference Sentry).
4. Neon assigns a new connection string. Update `DATABASE_URL` in Vercel → **Save** → trigger redeploy.
5. Smoke-check `/api/auth/me` from a known-good admin session → expect `200 ok`.
6. Smoke-check `/api/admin/contestants` and `/admin/audit-logs` for the most recent rows.
7. **Notify** signed-in users via the in-app notification system that the service was unavailable.

**Expected RTO end-to-end:** 25–45 min.

#### 2.4b "We deployed a bad release"

1. Vercel → **Deployments** → select the last green deployment.
2. **Promote to Production** (effective immediately; no DNS hop).
3. Open a ticket in `docs/incident-log.md`.
4. Roll the fix forward on a new deployment. **Don't** try to patch the bad one — the rolled-back deploy stays in production until the new one is green.

**Expected RTO end-to-end:** 5 min.

#### 2.4c "Something feels broken but I can't tell what"

1. Check Sentry (P7-T017) for new error spikes.
2. Check `/admin/payments?stuck=1` — stuck payments correlate with webhook / AdmasPay outages.
3. Check `/admin/audit-logs` — sudden quiet often means a route is throwing 500s.
4. Check Neon → **Insights** for query timeouts.
5. If still unclear, escalate to the founder. **Do not** start hot-fixing blindly — the audit log is the canonical truth and a misdirected fix can break it.

### 2.5 Secret rotation calendar

| Secret | Rotation cadence | Owner | Current age (placeholder — DevOps to fill in at first rotation) |
| --- | --- | --- | --- |
| `JWT_SECRET` | 180 days | Founder + DevOps | – |
| `DATABASE_URL` (Neon password) | 180 days | Founder + DevOps | – |
| `TELEBIRR_HMAC_SECRET` | 180 days | Founder + Payments owner | – |
| `CLOUDINARY_API_SECRET` | 365 days (or on suspected leak) | Founder + DevOps | – |
| `RESEND_API_KEY` / `POSTMARK_SERVER_TOKEN` | 365 days | DevOps | – |
| `UPSTASH_REDIS_REST_TOKEN` | 365 days | DevOps | – |
| `SENTRY_DSN` | Treat as public — no rotation needed | – | – |

Rotation is recorded in `docs/incident-log.md` with a `rotation:` prefix. The drill in §2.3.4 verifies the rotation procedure itself works.

### 2.6 Incident response

| Severity | Definition | Response | Comms |
| --- | --- | --- | --- |
| **P0** | Production fully down OR contestant PII leaking OR payment integrity compromised | Founder + DevOps drop everything. Restore per §2.4 immediately. | Email + in-app banner within 30 min. Public statement within 4 h. |
| **P1** | A core flow (apply / submit / pay) broken for everyone | Founder + DevOps engage within 1 h. | In-app banner within 1 h. |
| **P2** | A non-core flow broken (e.g. audit-logs viewer 500s) | Fix in next release. | None unless asked. |
| **P3** | Cosmetic / low-impact | Backlog. | None. |

After-action writeup template (in `docs/incident-log.md` within 5 business days for any P0/P1):

1. Timeline (UTC).
2. Customer impact (how many contestants, how many payments).
3. Root cause (technical, not "the engineer was tired").
4. What we changed to prevent recurrence.
5. What we explicitly chose **not** to change, and why.

### 2.7 Trust boundaries (one-line summary; full version in §1 above)

- Sec-Fetch-Site CSRF check on every mutating endpoint.
- `requireRole()` RBAC guard on every admin / referee endpoint.
- HMAC verification on the AdmasPay webhook.
- Email-verification gate before a contestant can transition to `submitted`.
- Cloudinary `public_id` prefix check that prevents a contestant from attaching another contestant's upload.

A breach of any one of these is a P0.

### 2.8 Pre-launch security checklist

This is the operational checklist; the application-level Pre-Production Gate lives in [task-tracker.md](task-tracker.md) §8.

- [ ] All secrets rotated and applied via Vercel env-var UI (`P0-T002`, `P0-T003`, `P0-T004`, `P0-T007`).
- [ ] Upstash Redis provisioned and `UPSTASH_REDIS_*` set in Vercel env (`P0-T009b`).
- [ ] Cloudinary credentials set in Vercel env; smoke upload of a 60–180 s MP4 verified.
- [ ] Transactional email provider (`RESEND_API_KEY` or `POSTMARK_SERVER_TOKEN`) set in Vercel env; welcome email arrives within 60 s on a fresh registration (`P7-T006`).
- [ ] `SENTRY_DSN` set in Vercel env; a deliberately-thrown error in a deploy preview shows up in Sentry within 60 s (`P7-T017`).
- [ ] `npm audit` advisories patched (§8 Pre-Production Gate).
- [ ] All four legal pages reviewed and signed off by counsel; `<LegalDraftBanner>` removed from each (`P7-T001`–`P7-T004`).
- [ ] Bilingual EN/AM strings reviewed by a native Amharic translator (`P7-T013`).
- [ ] Backup drill (§2.3) executed once with green outcome.
- [ ] External penetration test scoped and completed (§8 Pre-Production Gate).
- [ ] Founder + DevOps on-call rotation defined for season opening week.

---

*End of SECURITY.md. Mutate as the production posture evolves.*
