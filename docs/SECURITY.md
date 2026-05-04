# Security requirements

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
