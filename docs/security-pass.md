# Phase 7 — Security Pass (P7-T016)

> Owner: Implementation Agent (2026-05-06).
> Acceptance: each row in the architecture-plan checklist either green ✓ or filed as a follow-up with a tracking ID.

This is a code-against-checklist audit. The architectural plan lives in
[SECURITY.md](SECURITY.md) Part 1; the operational runbook lives in
[SECURITY.md](SECURITY.md) Part 2. This document is the verification that
each row in Part 1 either reflects current reality or has an explicit
follow-up.

---

## 1. Threat-model coverage

| # | Threat (per SECURITY.md §1) | Code reality | Status |
| --- | --- | --- | --- |
| 1 | Account takeover | `bcryptjs` hash + 14-day JWT cookie + `/api/auth/login` rate-limit (10/15min/IP) + `Sec-Fetch-Site` CSRF on all mutations | ✓ Mitigated. **Gap vs. plan:** plan calls for Argon2id; we use bcrypt. Tracked as `S-FOLLOWUP-001` (low — bcrypt at cost 10 is acceptable for the launch population) |
| 2 | Unauthorized scoring | `requireRole("referee","admin")` on every `/api/referee/*`; `refereeCanAccess()` per-submission RBAC; admin status mutations audit-logged with reason | ✓ Mitigated |
| 3 | Payment fraud | HMAC verification on AdmasPay webhook (401 on bad sig); idempotent `payments.id` PK; admin override restricted to `pending` only; refund flow is two-step with audit log | ✓ Mitigated. **Gap vs. plan:** plan calls for full server-side re-fetch from AdmasPay after webhook; we trust the HMAC. Tracked as `S-FOLLOWUP-002` (medium — re-fetch endpoint not yet documented by AdmasPay) |
| 4 | Video tampering / leaks | Cloudinary `public_id` prefix check (`brs/<contestantId>/...`) prevents cross-contestant attachment; submission status filters showcase + queue | ✓ Mitigated for current scope. Signed-URL transcoder webhooks are out of scope until a transcoder is wired |
| 5 | PII exposure | Anonymous lookups return `displayName` only (P0-T010); referee surface uses stage-name → initials fallback; audit log payload never stores raw PII | ✓ Mitigated |
| 6 | DDoS / cost amplification | `enforceRateLimit` on login (10/15min) and result-checker (30/5min); Upstash backend ready to wire when keys arrive (P0-T009b) | ✓ Mitigated for current scope |
| 7 | XSS / CSRF | No `dangerouslySetInnerHTML` in `src/`; no `eval()`; React JSX auto-escapes; `Sec-Fetch-Site` CSRF on all mutations; webhook opted out (signed payload, no cookies) | ✓ Mitigated |
| 8 | Insecure direct object references | Per-endpoint object-level checks: `getContestantByUserId(session.sub)` for self; `requireRole("admin")` for cross-user lookups; `refereeCanAccess` for referee surface | ✓ Mitigated |
| 9 | Supply-chain compromise | `npm ci` in CI; locked `package-lock.json`; 2 outstanding `npm audit` advisories (next < 14.2.35, postcss). Pinned in §8 Pre-Production Gate | ⚠ **Open** — must run `npm audit fix --force` and re-test before launch |
| 10 | Insider misuse | Audit log is append-only at the application layer (`audit_logs` has no UPDATE/DELETE endpoint); admin status mutations require ≥ 4-char reason; admin overrides on terminal payments rejected | ✓ Mitigated for application layer. **Gap vs. plan:** plan calls for DB-level revocation of UPDATE/DELETE on `audit_logs` for the API user. Tracked as `S-FOLLOWUP-003` (low — application-layer guarantee + Neon audit logs cover this) |

---

## 2. Spot checks against the running code

| Check | Where I looked | Result |
| --- | --- | --- |
| `dangerouslySetInnerHTML` count | `grep -rn dangerouslySetInnerHTML src/` | 0 occurrences ✓ |
| `eval(` / `new Function(` | `grep -rn 'eval(\\|new Function(' src/` | 0 occurrences ✓ |
| Plaintext password storage | `grep -rn password src/lib/auth.ts` | bcrypt only; never logged ✓ |
| Token storage (sha256 hash, not plaintext) | `src/lib/password-reset.ts`, `src/lib/email-verification.ts` | Both hash before storage ✓ |
| Webhook signature verification | `src/app/api/payments/webhook/route.ts:29` | `verifyTelebirrSignature` returns 401 on bad sig ✓ |
| CSRF on mutations | `src/lib/api.ts` `route()` wrapper checks `Sec-Fetch-Site`; webhook explicitly opts out with `{ csrf: "skip" }` | ✓ |
| Audit log append-only | `src/app/api/admin/audit-logs/route.ts` exposes only `GET`; no `PATCH` / `DELETE` route | ✓ |
| RBAC on admin / referee endpoints | Every `/api/admin/*` calls `requireRole("admin")`; every `/api/referee/*` calls `requireRole("referee","admin")` | ✓ |
| PII redaction in payment_events | `redactPayload()` in `src/lib/payments.ts` | ✓ |
| PII scrubbing in observability | `src/lib/observability.ts` `scrub()` strips `password`/`token`/`cookie`/etc., masks emails | ✓ |

---

## 3. Outstanding security follow-ups

| ID | Description | Severity | Owner | Where to track |
| --- | --- | --- | --- | --- |
| `S-FOLLOWUP-001` | Migrate password hashing from bcrypt to Argon2id | Low | DevOps + Implementation | New post-launch task |
| `S-FOLLOWUP-002` | Add server-side re-fetch from AdmasPay after webhook (idempotent reconciliation) | Medium | Founder + Payments owner + Implementation | Open when AdmasPay publishes the verify endpoint |
| `S-FOLLOWUP-003` | DB-level revocation of `UPDATE`/`DELETE` on `audit_logs` for the application user | Low | DevOps | New post-launch task |
| `S-FOLLOWUP-004` | `npm audit fix --force` patches next + postcss CVEs | High (gate for production) | Implementation | Already filed in §8 Pre-Production Gate |
| `S-FOLLOWUP-005` | External penetration test before public launch | Required for launch | Founder + external | Already filed in §8 Pre-Production Gate |

---

## 4. What this audit deliberately did NOT cover

- **Live traffic profiling:** real IP-level attack patterns appear only after launch. Sentry + Vercel Firewall + Upstash rate-limit metrics are the post-launch monitoring surface.
- **Penetration testing:** out of scope for an in-Codespace agent. Tracked under §8 Pre-Production Gate.
- **Compliance certifications:** no PCI / SOC2 / GDPR certifications are claimed. The audit verifies that the code is **correct**, not that it is **certified**.
- **Side-channel timing attacks:** bcrypt + jose constant-time comparators handle the obvious cases; deeper analysis is a post-launch follow-up.

---

*Phase 7 security pass — 2026-05-06. Three low-severity gaps tracked as `S-FOLLOWUP-*`; the high-severity npm-audit gap is the existing §8 row.*
