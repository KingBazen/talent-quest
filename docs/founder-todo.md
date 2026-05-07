# Founder TODO — Pre-Launch Punch List

> Generated 2026-05-06 by the build agent at the close of Phase 7.
> Single canonical list of every action that requires **you** (founder, counsel, translator, external pentester, or vendor account access) — not the agent.
> Once every box below is checked, the platform is ready for a production deploy and public launch.

This document supersedes nothing — every line below is also tracked in
[docs/task-tracker.md](task-tracker.md) §8 Pre-Production Gate. The two are
intentionally redundant: the tracker is the project memory, this list is your
checklist.

---

## A. Production secrets — vendor accounts

These are the only things between today and a working production deploy.
Code paths are live in every case; only the env var / account is missing.

- [ ] **Rotate Neon Postgres credentials** (`P0-T002`). Neon Console → Roles → Reset password. Update `DATABASE_URL` in Vercel env.
- [ ] **Rotate / void AdmasPay checkout link + HMAC secret** (`P0-T003`). Old `apl_…` token must return invalid; new link must work end-to-end. Update `TELEBIRR_HMAC_SECRET` in Vercel env.
- [ ] **Move all secrets into Vercel env-var UI** (`P0-T007`). Confirm production build reads from Vercel env, not from any committed file.
- [ ] **Provision Upstash Redis + paste creds** (`P0-T009b`). Set `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`. Smoke verify by hitting `/api/auth/login` 11× from one IP — the 11th must return 429 even when the lambda differs.
- [ ] **Provision Cloudinary** (`P3-T002` / `P3-T003`). Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. Run a smoke upload of a 60–180 s phone-shot MP4.
- [ ] **Provision transactional email provider** (`P7-T006`). Either:
  - Resend: set `RESEND_API_KEY` + `EMAIL_FROM`.
  - OR Postmark: set `POSTMARK_SERVER_TOKEN` + `POSTMARK_STREAM` + `EMAIL_FROM`.
  Smoke verify by registering a fresh contestant — welcome email must arrive within 60 s and contain a working verify link.
- [ ] **Provision Sentry project + DSN** (`P7-T017`). Set `SENTRY_DSN`. Smoke verify by deliberately throwing in a deploy preview and confirming the event lands in the Sentry inbox within 60 s.

---

## B. Counsel + translator — content sign-off

The agent shipped placeholder copy. Replace it before any marketing push.

- [ ] **Counsel review of `/terms`** (`P7-T001`). Replace any section the lawyer red-pens. Remove the `<LegalDraftBanner>` component from the page once signed off.
- [ ] **Counsel review of `/privacy`** (`P7-T002`). Same procedure as above.
- [ ] **Counsel review of `/refund-policy`** (`P7-T003`). Same procedure as above.
- [ ] **Counsel review of `/content-rights`** (`P7-T004`). Same procedure as above.
- [ ] **Native Amharic translator review** of [src/lib/i18n.ts](../src/lib/i18n.ts) (`P7-T013`). The agent-drafted Amharic dictionary needs a native pass for register, grammar, and idiomatic flow. Surfaces to verify: navbar, hero, verify-email banner, legal banners, common UI strings.
- [ ] **Founder copy review** of `/about` and `/show-format` and `/judges`. Production-quality voice review on Phase 1 surfaces.
- [ ] **Founder copy review** of payment success / failure / cancel return states on `/contestant/payment` (`P4-T004`).
- [ ] **Add real contact data** to `/contact` if/when a real address + phone exists.

---

## C. Pre-launch verification (run once each)

- [ ] **`npm audit fix --force`** (will install `next@14.2.35`+ which patches the 4 advisories). Re-run the QA harness afterwards. Tracked in §8 of task-tracker as the high-severity row.
- [ ] **Lighthouse mobile audit** on six critical routes via a Vercel preview URL: `/`, `/auditions`, `/register`, `/login`, `/contestant/dashboard`, `/result-checker`. Each must score **≥ 90** Performance + SEO + Best Practices + Accessibility. Runbook in [docs/perf-pass.md](perf-pass.md). File `P7-T015a/b/...` follow-ups for any sub-90 score.
- [ ] **Backup-verification drill** per [docs/SECURITY.md](SECURITY.md) §2.3. Four sub-drills, ~30 min total: Neon PITR, Vercel rollback, Cloudinary integrity, secrets rotation.
- [ ] **External penetration test**. Scope and complete one round before public launch. Tracked in §8 of task-tracker.
- [ ] **Re-run smoke test under rotated creds** (`P0-T011`). Once §A above is done, re-run `npm run qa:smoke` — expect 48/48 still green. Add the AdmasPay `payment-init` flow as a manual check.

---

## D. Operational readiness

- [ ] **Define a founder + DevOps on-call rotation for season opening week.** Source of truth: a paragraph in `docs/SECURITY.md` Part 2 §2.6.
- [ ] **Hide / disable the seeded test accounts** before any real contestant ever sees the site. Either delete the `admin@*` and `referee@*` rows from `users`, or rotate their passwords away from the dev defaults. (The login page already hides the demo cred block in production builds — but the underlying users still exist.)
- [ ] **Set up `docs/incident-log.md`.** Empty file with the template from `docs/SECURITY.md` Part 2 §2.6. Every P0/P1 incident lands here within 5 business days.
- [ ] **Decide and document** the production domain (the agent assumes `https://blingrecordsshow.com`; update `NEXT_PUBLIC_SITE_URL` once finalised).

---

## E. Future phases (not started — agent halted per task-tracker §6)

The tracker's rule #6 says agents must not start a phase until every dependency is `DONE`. The agent stopped at the end of Phase 7. Phases 8–14 require **product decisions** before any task list can be drawn up:

- **Phase 8 — Audience engagement.** What kind? Comments, viewing parties, fan-driven highlights? Signal: which of these does Bling Records actually want?
- **Phase 9 — Voting.** Anti-fraud is the hard part. SMS-gated? Per-IP? Captcha? Tied to a paid SMS short-code? Decision needed before any code.
- **Phase 10 — Episodes / seasons.** Do we host the show on this site, on YouTube, on a TV broadcast site, or all three? Producer-role permissions land here.
- **Phase 11 — Media platform.** Streaming provider evaluation. Mux? Cloudflare Stream? Akamai? Cost vs. quality tradeoff is the founder's call.
- **Phase 12 — Mobile apps.** Recommended: Flutter (one codebase, both stores). But: do we want native? PWA only?
- **Phase 13 — Sponsors / mentors.** Ad placement architecture, mentor session booking flow.
- **Phase 14 — Advanced ops.** Super-admin tier, support ticket queue, scheduled jobs.

When you're ready to start any of these, brief the agent with: (a) the goal, (b) the constraints, (c) any product decisions already made. The agent will draft a per-task plan in §4 of the tracker before writing code.

---

## F. What you do NOT need to worry about (built and verified)

These are documented here so you can stop tracking them:

- ✅ Auth (login, register, forgot/reset password, email verification, JWT cookie + RBAC, session lifecycle).
- ✅ Contestant flow (register → dashboard → profile → application → payment → result, soft-delete withdrawal, anonymisation contract).
- ✅ Video upload (Cloudinary direct upload, server-side validation, supersede flow, URL-paste fallback).
- ✅ Payment flow (AdmasPay hosted checkout, HMAC webhook, payment_events audit, admin override + refund tools, "stuck > 24h" reconciliation).
- ✅ Referee portal (assignment-aware queue, in-app player, sliders + public/private notes, confirm-before-overwrite, own history).
- ✅ Admin dashboard (10-tab subnav, contestant detail, status mutations with reason, assignments, results bulk publish, payments, messages inbox, CSV exports, settings, audit-log viewer).
- ✅ Audit chain (every mutation routes through `recordAudit()`; viewer reads them with filters by target type / target id / action / actor).
- ✅ CSRF defence (every mutating endpoint checks `Sec-Fetch-Site`; webhook explicitly opts out).
- ✅ Email pipeline (welcome, verify, status change, payment receipt, referee assignment) — fully wired, awaiting only a vendor account.
- ✅ In-app notifications inbox.
- ✅ Notification preferences (per-category opt-out).
- ✅ Bilingual EN/AM scaffold (one cookie, one provider, one toggle, dictionary live).
- ✅ Sentry shim with PII scrubbing — wired into the global API error handler.
- ✅ Backup + restore + secret-rotation runbook.
- ✅ Automated QA smoke harness (`npm run qa:smoke`, 48 checks, currently green).

---

## Final note

The codebase passes type-check + lint + a 48-check live smoke harness as of
2026-05-06. Anything you add to the launch list belongs in §8 of
[docs/task-tracker.md](task-tracker.md), not here — this file is a snapshot
generated at the moment Phase 7 closed.

Good luck with the launch.
