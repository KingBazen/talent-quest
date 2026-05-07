# Bling Records Show — Full Development Roadmap

> **Document type:** Phased delivery plan covering MVP through long-term ecosystem.
> **Read first:** [current-product-ux-ecosystem-audit.md](current-product-ux-ecosystem-audit.md), [bling-records-show-mvp-ux-technical-scope.md](bling-records-show-mvp-ux-technical-scope.md), [full-ux-ecosystem-documentation.md](full-ux-ecosystem-documentation.md).
> **Sister docs:** [product-feature-matrix.md](product-feature-matrix.md), [technical-architecture-plan.md](technical-architecture-plan.md), [data-model-and-api-plan.md](data-model-and-api-plan.md), [admin-and-operations-plan.md](admin-and-operations-plan.md), [task-tracker.md](task-tracker.md), [agent-execution-rules.md](agent-execution-rules.md).
> **Status of code:** No application code is to be modified by the act of writing this doc.

---

## How to read this roadmap

- Each **phase** is a deliverable bundle, not a timeline. We ship a phase when its acceptance criteria are met, not when a date is hit.
- **Risk levels:** Low / Medium / High / Critical.
- **Owner roles:** Implementation Agent, Founder, DevOps, Legal, Designer, QA — assigned per task.
- **Phase 0 blocks every other phase.** No exceptions. See [agent-execution-rules.md](agent-execution-rules.md).
- Concrete, agent-actionable line items live in [task-tracker.md](task-tracker.md). This file gives the structure; the tracker holds the state.

### Phase dependency graph (textual)

```
Phase 0 (Security)  ─────────────► every other phase

Phase 1 (Repositioning)  ───┬──► Phase 2 (Application)
                            └──► Phase 7 marketing copy

Phase 2 (Application)  ─────┬──► Phase 3 (Upload)
                            └──► Phase 4 (Payment)

Phase 3 (Upload)       ─────┬──► Phase 5 (Referee)
                            └──► Phase 6 (Admin)

Phase 4 (Payment)      ─────► Phase 6 (Admin payments UI)

Phase 5 (Referee)      ─────► Phase 6 (Admin)

Phase 6 (Admin)        ─────► Phase 7 (Launch readiness)

Phase 7 (Trust + Legal + QA)  ─────► PUBLIC LAUNCH GATE

────────────────────────────── PUBLIC LAUNCH ──────────────────────────────

Phase 8 (Audience)     ─────► Phase 9 (Voting), Phase 11 (Media)
Phase 9 (Voting)       ─────► Phase 10 (Episodes)
Phase 10 (Episodes)    ─────► Phase 11 (Media)
Phase 11 (Media)       ─────► Phase 12 (Mobile apps)
Phase 12 (Mobile apps) ─────► Phase 13 (Sponsors), Phase 14 (Advanced ops)
Phase 13 (Sponsors)    ─────► Phase 14
Phase 14 (Advanced ops)
```

---

## Phase 0 — Security Cleanup *(blocks everything)*

| Field | Value |
| --- | --- |
| **Goal** | Remove all committed secrets, rotate any exposed credentials, harden sensitive endpoints, and verify the platform is safe to develop against. |
| **Risk level** | **Critical** |
| **Dependencies** | None |
| **Blocking?** | Yes — no other phase may begin until this one is **DONE** |

### Key tasks
- Remove [.env.local](../.env.local) from Git tracking.
- Rotate Neon Postgres credentials.
- Rotate / void exposed AdmasPay checkout link + any HMAC secrets.
- Generate a fresh `JWT_SECRET` (≥ 48 random bytes, base64url).
- Update [.gitignore](../.gitignore) to exclude `.env`, `.env.local`, `.env.*.local`.
- Refresh [.env.example](../.env.example) with placeholders only.
- Move all real secrets to Vercel’s environment-variable UI (per environment).
- Remove visibly seeded credentials from the public `/login` page (hide in production).
- Add rate-limiting to `/api/auth/login` and `/api/contestants/[id]`.
- Re-test DB connectivity, login, and AdmasPay checkout init under rotated credentials.
- Update README with security instructions and a `.env.local`-warning banner.

### Acceptance criteria
- `git ls-files .env.local` returns empty; `git check-ignore .env.local` matches.
- Old Neon credentials are rejected by the provider.
- Old AdmasPay checkout link returns invalid; new link works.
- Production build does not render seeded credentials.
- Login throttles at 10 fails / 15 min / IP; result-checker throttles at 30 / 5 min / IP.
- README quick-start works against current code.

### Owners
Implementation Agent + Founder + DevOps. **No code touches before Founder signs off on credential rotation.**

---

## Phase 1 — Product Repositioning

| Field | Value |
| --- | --- |
| **Goal** | Convert the generic TalentQuest / AGT framing into The Bling Records Show across every public surface, without changing any operational behaviour. |
| **Risk level** | Medium (brand mistakes are expensive to undo) |
| **Dependencies** | Phase 0 |

### Key tasks
- Update brand language across `src/app/**/page.tsx` and `src/components/home/**`.
- Update [layout.tsx](../src/app/layout.tsx) `metadata` and OpenGraph fields.
- Update homepage hero, How-It-Works, Categories, Testimonials, CTA sections.
- Replace `/how-it-works` content under a new `/auditions` route (preserve old as redirect).
- Add `/about` page (Bling Records + Neo Studios story).
- Add `/show-format` page (24-episode teaser).
- Add `/judges` page (placeholder until real referees confirmed).
- Replace fictional testimonials and hardcoded hero stats with real values or remove.
- Remove `/admin-demo`, `/referee-demo`, `data/talentquest.db*`, `better-sqlite3` comment.
- Rewrite [README.md](../README.md) to match Postgres + Neon reality.
- Footer: remove publicly-listed `/admin`, `/referee` links from the “For staff” column.
- Replace placeholder contact info on `/contact` with real Bling Records / Neo Studios values once provided.

### Acceptance criteria
- No “TalentQuest” brand string remains in user-facing copy or metadata.
- Lighthouse SEO ≥ 90 across `/`, `/about`, `/auditions`.
- All redirects in place (no 404s on previously valid URLs).
- README quick-start matches actual stack.
- No fictional users / numbers in production UI.

### Launch gate
This phase ends with a **brand review** by the founder before merging the rebrand to `main`.

---

## Phase 2 — Contestant Application System

| Field | Value |
| --- | --- |
| **Goal** | Production-grade audition application: registration, profile, application tracking, edit-profile, password reset. |
| **Risk level** | Medium |
| **Dependencies** | Phase 1 |

### Key tasks
- Extend `contestants` schema with: real name, DOB, country, music_category, talent_type, social_ig, social_tt, social_yt, consent timestamps.
- Update [/register](../src/app/register/page.tsx) with the new fields and music-first taxonomy (rap / singing / songwriter / performance / instruments / other).
- Add three explicit consents: rules acceptance, content licensing, age confirmation.
- Build `/contestant/dashboard`, `/contestant/profile`, `/contestant/application`, `/contestant/result`.
- Add `PATCH /api/contestants/me` for safe edits (cannot change DOB / consents post-registration).
- Build `/forgot-password` + `/reset-password` flow with `password_reset_tokens` table.
- LocalStorage save-resume across registration steps.
- Result-checker status copy refresh (public-facing labels for every internal status).

### Acceptance criteria
- A new contestant can register, save partway through, return, and complete.
- Existing contestants can edit phone / bio / socials but not DOB / consents.
- A contestant who lost their password can recover access in under 30 seconds.
- All consent timestamps are stored and visible in audit log (when log exists in Phase 6).

---

## Phase 3 — Video Upload System

| Field | Value |
| --- | --- |
| **Goal** | Make Cloudinary direct-upload work end-to-end on the client, with validation, progress, retry, and preview. |
| **Risk level** | High (largest single missing technical piece in the audit) |
| **Dependencies** | Phase 2 |

### Key tasks
- Wire client to consume `createUploadIntent` returned by `GET /api/submissions`.
- Add upload progress UI with KB / percentage / ETA.
- Validate format (MP4 / MOV / WEBM), size (≤ 500 MB), duration (60–180 s), resolution (≥ 480p hard, ≥ 720p preferred) — client-side first, server-side double-check via Cloudinary metadata.
- Add retry with exponential backoff (up to 3 transient retries).
- Show preview after upload (`<video controls>` against `secure_url`).
- Persist `cloudinary_public_id`, `format`, `bytes`, `width`, `height`, `duration_sec` on `submissions`.
- Add replace-submission flow (mark old as `superseded`).
- Keep URL submission as fallback under a “Trouble uploading?” affordance.
- Update `/upload-guide` content for music auditions.

### Acceptance criteria
- A 200 MB MP4 uploads from a phone in under 2 minutes on 4G.
- Out-of-spec uploads are rejected client-side with clear copy.
- Network failures auto-retry; user is never asked to re-pick the file.
- Replace submission keeps audit history of prior takes.

---

## Phase 4 — Payment Flow

| Field | Value |
| --- | --- |
| **Goal** | A reliable, end-to-end AdmasPay flow that defaults to Option B (free to apply, fee at shortlist), with admin reconciliation as a safety net. |
| **Risk level** | High (real money) |
| **Dependencies** | Phase 0 (rotated credentials), Phase 2 (contestant exists), Phase 3 (submission exists) |

### Key tasks
- Verify AdmasPay merchant account is configured under rotated credentials.
- Enforce Option B by default: payment is unlocked only when contestant status reaches `shortlisted`. Founder can override via the upcoming admin settings toggle (`fee_required_at`).
- Build `/contestant/payment` page (extracts the existing PaymentCard).
- Add success / failure / cancel pages with copy reviewed by founder.
- Confirm webhook signature verification still passes after rotation.
- Implement `/payments/mock` page (dev-only) **or** remove stub mode entirely.
- Add admin payment-override UI on top of existing `PATCH /api/admin/payments/[id]`.
- Add manual reconciliation flow for stuck `pending` payments older than 30 minutes.

### Acceptance criteria
- A contestant moved to `shortlisted` can pay and complete; status auto-flips to `succeeded` within 60 seconds of webhook.
- Failed payments can be retried without creating duplicate `payments` rows.
- Admin can override a stuck payment and the change is audit-logged.

---

## Phase 5 — Referee / Judge Portal

| Field | Value |
| --- | --- |
| **Goal** | Replace the global top-50 queue with an assignment-aware portal that has in-app playback and full submission status mutation. |
| **Risk level** | Medium |
| **Dependencies** | Phase 3 (uploads), Phase 6 partial (admin assignment UI lands here too) |

### Key tasks
- Add `submission_assignments` table; rewrite `/api/referee/queue` to filter by assignment.
- Build `/referee/submissions` (filterable list) and `/referee/submissions/[id]` (detail).
- Embed `<video controls>` against Cloudinary `secure_url` in the detail screen.
- Add public + private notes columns on `score_notes`.
- Add `PATCH /api/referee/submissions/[id]/status` for `approved / rejected / flagged`.
- Add prior-scores summary visible to the referee (own scores only; others as count).
- Add “done reviewing” state with refresh CTA.
- Add `/referee/reviews` (own history).

### Acceptance criteria
- Two referees with disjoint assignments see disjoint queues.
- A referee never leaves the page to evaluate a submission.
- Status transitions persist and reflect immediately in admin views.

---

## Phase 6 — Admin / Producer Dashboard

| Field | Value |
| --- | --- |
| **Goal** | Production-grade admin experience: detail views, filters, status mutations, payment management, exports, audit logs, settings. |
| **Risk level** | Medium |
| **Dependencies** | Phases 2–5 |

### Key tasks
- Build `/admin/contestants/[id]` detail view with submissions, scores, payments, audit timeline.
- Add filters (status, city, category, score band) on `/admin/contestants` and `/admin/submissions`.
- Add `/admin/assignments` UI for assigning referees.
- Add admin status mutation API + UI (with reason field for downgrades).
- Add `/admin/payments` table with override action.
- Add `/admin/results` for round publication (bulk status update).
- Add `/admin/settings`: registration_open, submissions_open, fee_required_at, fee_cents, current_round.
- Add `audit_logs` table + viewer at `/admin/audit-logs`.
- Add CSV export at `/admin/exports` and per-list export buttons.
- Hide / remove the “Open round 2” no-op button.
- Build `/admin/messages` to consume `contact_messages`.

### Acceptance criteria
- Admin can take any contestant from `registered` → `eliminated` via UI (no DB access required).
- Every admin status mutation writes to `audit_logs`.
- CSV export respects filters and downloads correctly.
- Settings toggles change runtime behaviour without a redeploy.

---

## Phase 7 — Trust, Legal, and Launch Readiness

| Field | Value |
| --- | --- |
| **Goal** | Be safe, legal, and credible enough for a public marketing push. |
| **Risk level** | Critical (legal exposure) |
| **Dependencies** | Phases 0–6 |

### Key tasks
- Write `/terms`, `/privacy`, `/refund-policy` (P0); `/content-rights` (P1) — all reviewed by counsel.
- Implement transactional emails (registration welcome, status change, payment receipt, referee assignment) — recommend Postmark / Resend.
- Add notification preference page on contestant profile.
- Email verification on registration before `submitted` status is allowed (P1).
- Bilingual EN/AM pass on all contestant-facing copy.
- Full QA pass: every user journey J1–J13.
- Performance pass: LCP ≤ 2.5 s on 4G across `/`, `/about`, `/auditions`, `/register`, `/contestant/dashboard`, `/result-checker`.
- Security pass: confirm RBAC on every privileged endpoint; CSRF defence; rate-limits; no `// @ts-ignore`; no `console.log` of secrets.
- Lighthouse mobile run ≥ 90 across the 6 routes above.

### Acceptance criteria
- Lawyer signs off on legal pages.
- Every user journey passes manual QA.
- No P0 / P1 bugs open.
- **Launch gate:** founder approves Phase 7 done before any public marketing.

> **PUBLIC LAUNCH GATE** — Phases 0–7 complete. Marketing push allowed.

---

## Phase 8 — Audience Engagement

| Field | Value |
| --- | --- |
| **Goal** | Open the platform to fan accounts: public contestant pages, persisted likes, follows, comments. |
| **Risk level** | High (abuse + moderation) |
| **Dependencies** | Phase 7 (live) |

### Key tasks
- Add `audience_users`, `likes`, `comments`, `moderation_queue` tables.
- Build `/contestants` directory and `/contestants/[id]` public profile.
- Add fan registration / login (separate from contestant identity).
- Persist likes, follows, comments.
- Build `/admin/moderation` with comment + submission flag actions.
- Add report mechanism on contestant pages.
- Add comment rate-limit + abuse heuristics.
- Replace fake Reels likes with real ones, **only** if there is real content to like.

### Acceptance criteria
- Fan accounts can be created, log in, like, follow, and comment.
- Moderator can hide / remove content with audit log.
- No N+1 queries when listing contestants with engagement counts.

---

## Phase 9 — Voting System

| Field | Value |
| --- | --- |
| **Goal** | Allow audience-influenced outcomes with a strong anti-fraud and identity-verification layer. |
| **Risk level** | High (fraud, integrity) |
| **Dependencies** | Phase 8 (audience identity) |

### Key tasks
- Define voting rules (per round, weight vs judges, free vs paid, max votes per user).
- Add `votes` table + audit log entries per vote.
- Add identity verification (phone OTP + email).
- Add per-IP / per-user / per-device rate-limit.
- If paid voting approved: re-use payments scaffolding; require explicit founder + finance sign-off.
- Build `/fan/vote` and round-result publication flow.
- Decide leaderboard visibility (public / private / per-region).

### Acceptance criteria
- Votes cannot be cast without verified identity.
- A botnet cannot inflate counts beyond a published threshold without raising an alert.
- Voting open / close windows are admin-controlled and audit-logged.

---

## Phase 10 — Episodes and Season Management

| Field | Value |
| --- | --- |
| **Goal** | Model the 24-episode reality format as data so producers can plan, publish, and reflect on seasons. |
| **Risk level** | Medium |
| **Dependencies** | Phase 7 minimum, ideally Phase 8 |

### Key tasks
- Add `seasons`, `episodes`, `challenges`, `performances`, `eliminations` tables.
- Build producer routes (`/producer/dashboard`, `/producer/episodes`, `/producer/schedule`).
- Add public `/episodes` and `/episodes/[id]` pages.
- Add contestant progression model (which round, which episode, eliminated when).
- Add draft vs published distinction so unannounced schedules don’t leak.
- Tie episodes to `media_clips` and `performances`.

### Acceptance criteria
- A producer can build a 24-episode season and publish it episode-by-episode.
- Public visitors only see published episodes.
- Eliminations are reflected in `/result-checker`.

---

## Phase 11 — Media Platform Expansion

| Field | Value |
| --- | --- |
| **Goal** | Distribute clips, reels, highlights with a real player and a watchlist. |
| **Risk level** | Medium (CDN cost) |
| **Dependencies** | Phase 10 |

### Key tasks
- Add `media_clips` table tied to performances / episodes.
- Build `/stage-performances` + clip browsing UI with category filters.
- Add Reels view properly (real videos, persisted likes, real audio).
- Evaluate streaming providers (Cloudinary HLS, Mux, Bunny CDN); pick one and migrate from naive `<video>` tags.
- Add captions where the provider supports it.
- Add watchlist for fans.
- Add CDN / cache strategy for thumbnails and short clips.

### Acceptance criteria
- 5,000 concurrent viewers can watch a clip without provider throttling.
- Reels view loads in < 1.5 s on 4G with auto-mute and tap-to-unmute.
- Watchlist persists across devices for a logged-in fan.

---

## Phase 12 — Mobile Apps

| Field | Value |
| --- | --- |
| **Goal** | Native iOS + Android experience for contestants and audience. |
| **Risk level** | High (new platform) |
| **Dependencies** | Phase 11 stable |

### Key tasks
- Pick stack: **Flutter** recommended for single codebase + good camera / file pickers.
- Define mobile API contract (likely a thin layer over the existing Next.js API; consider versioning under `/api/v1/`).
- Implement auth (mobile-friendly JWT or refresh-token flow).
- Implement contestant dashboard, audition upload (with native camera path), result checker.
- Implement audience watch, vote, like, comment.
- Push notifications via Firebase / APNs.
- App Store + Play Store submission.

### Acceptance criteria
- Phone-shot audition uploads on mobile match desktop reliability.
- Push notifications deliver within 30 s of trigger.
- Apps pass App Store + Play Store review.

---

## Phase 13 — Sponsor / Partner Tools

| Field | Value |
| --- | --- |
| **Goal** | Monetization and brand integration. |
| **Risk level** | Medium (commercial complexity) |
| **Dependencies** | Phase 12 (mobile audience) ideally |

### Key tasks
- Add `sponsors` table + sponsor admin UI.
- Build `/sponsors` public page and per-sponsor pages.
- Add campaign placement model (banners on episodes, sponsored challenges).
- Build `/sponsor/dashboard` with aggregate-only analytics.
- Add branded-content rules to moderation queue.
- Implement mentor / celebrity guest portal alongside sponsor work.

### Acceptance criteria
- Sponsors can log in, view aggregate metrics, and download a campaign report.
- No sponsor-side route exposes per-user data.

---

## Phase 14 — Advanced Operations

| Field | Value |
| --- | --- |
| **Goal** | Scale the back-office: scheduling, notifications, moderation, support, analytics. |
| **Risk level** | Medium |
| **Dependencies** | Phases 10–13 |

### Key tasks
- Producer scheduling tool (mentor sessions, performance slots).
- Mentor scheduling tool.
- Internal notes & comments across admin/producer surfaces.
- Moderation queue v2 (auto-flag heuristics, escalation paths).
- Support tickets system.
- Advanced analytics (cohort, retention, funnel).
- Role-specific reporting (producer, sponsor, finance).
- Super-admin role + admin-of-admins UI.

### Acceptance criteria
- The platform can run a full 24-episode season without DB-direct interventions.
- Support agents can resolve common cases (password reset, payment dispute, lost-code) end-to-end through UI.

---

## Per-phase summary table

| Phase | Goal | Key Tasks | Dependencies | Acceptance Criteria | Owner | Risk Level |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | Security cleanup | §0 tasks above | None | Secrets removed + rotated; rate-limits live | Implementation Agent + Founder + DevOps | **Critical** |
| 1 | Repositioning | Brand swap + rebrand routes + cleanup vestigial | 0 | No “TalentQuest” in UI; SEO ≥ 90 | Implementation Agent + Designer + Founder | Medium |
| 2 | Contestant application | Profile schema + register + edit + reset password | 1 | Apply / edit / reset works end-to-end | Implementation Agent | Medium |
| 3 | Video upload | Cloudinary client + validation + preview + replace | 2 | 200 MB MP4 uploads in < 2 min on 4G | Implementation Agent | High |
| 4 | Payment | AdmasPay verified + payment page + override UI | 0, 2, 3 | Shortlisted contestant pays, status auto-flips | Implementation Agent + Founder | High |
| 5 | Referee portal | Assignments + in-app player + status mutations | 3, 6 partial | Disjoint queues; never leave page to evaluate | Implementation Agent | Medium |
| 6 | Admin dashboard | Detail + filters + assignments + audit + settings + export | 2–5 | All status changes via UI; audit log captures everything | Implementation Agent | Medium |
| 7 | Trust + legal + launch | Legal pages + emails + bilingual + QA + perf + sec | 0–6 | Lawyer + founder sign-off; Lighthouse ≥ 90 | Implementation Agent + Legal + Founder + QA | Critical |
| 8 | Audience engagement | Fan accounts + likes + comments + moderation | 7 | Real engagement persisted; moderator tools live | Implementation Agent | High |
| 9 | Voting | Identity verification + anti-fraud + vote API | 8 | Fraud-resistant vote casting; results audit-logged | Implementation Agent + Founder | High |
| 10 | Episodes / seasons | Seasons / episodes / performances + producer UI | 7+ | 24-episode plan publishable end-to-end | Implementation Agent + Producer | Medium |
| 11 | Media platform | Clips + reels + watchlist + streaming provider | 10 | 5k concurrent viewers; reels < 1.5 s LCP | Implementation Agent + DevOps | Medium |
| 12 | Mobile apps | Flutter app + push + store submission | 11 | Apps pass store review | Mobile Agent | High |
| 13 | Sponsors / mentors | Sponsor + mentor admin + dashboards | 12 | Sponsor sees aggregate-only metrics | Implementation Agent | Medium |
| 14 | Advanced ops | Scheduling + tickets + analytics + super-admin | 10–13 | Season runs without DB-direct intervention | Implementation Agent + Producer + Support | Medium |

---

## Build sequence (recommended)

1. **Strict serial** through Phases 0–7. Do not parallelise.
2. **Phase 7 ends with the public launch gate.** No marketing activity that promises Phase-8+ features may go live before they are real.
3. **Phases 8 and 9** can begin only after a real audition season has run end-to-end. Don’t build voting in a vacuum.
4. **Phase 10** (episodes) should happen **before or alongside** Phase 11 (media), because clips need to be tied to episodes to be useful.
5. **Phase 12** (mobile) is gated behind Phase 11 stability — mobile inherits all media surface.
6. **Phases 13 and 14** can run in parallel once Phase 12 is stable.

---

## Launch gates

| Gate | Phase | What it requires |
| --- | --- | --- |
| **Security gate** | end of Phase 0 | All §0 tasks done; rotated credentials verified |
| **Brand gate** | end of Phase 1 | Founder approves rebrand; SEO ≥ 90; no “TalentQuest” strings |
| **Operational gate** | end of Phase 6 | A new contestant can be processed end-to-end via UI alone (no DB poking) |
| **Public launch gate** | end of Phase 7 | Lawyer + founder sign-off; QA + perf + sec pass; bilingual pass |
| **Audience gate** | end of Phase 8 | Moderator tools live; abuse heuristics in place |
| **Voting gate** | end of Phase 9 | Identity verification + anti-fraud + audit log + admin override |
| **Mobile gate** | end of Phase 12 | Apps in store; analytics parity with web |

---

## Cross-cutting QA + security gates

- **QA gate per phase:** every phase ships only when its acceptance criteria are demonstrated by manual or automated test.
- **Security gate per phase:** new endpoints must pass the §16 checklist in [bling-records-show-mvp-ux-technical-scope.md](bling-records-show-mvp-ux-technical-scope.md) and the [agent-execution-rules.md](agent-execution-rules.md) security rules.
- **Type-check gate every commit:** `npm run type-check` must remain green.
- **Lint gate every commit:** `npm run lint` (after we wire it into CI in Phase 0) must remain green.

---

*End of Full Development Roadmap.*
