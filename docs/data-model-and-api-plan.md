# Bling Records Show — Data Model and API Plan

> **Document type:** Planning reference. Source of truth for what entities exist, what they’re for, and what API surface backs them.
> **Read first:** [current-product-ux-ecosystem-audit.md](current-product-ux-ecosystem-audit.md), [bling-records-show-mvp-ux-technical-scope.md](bling-records-show-mvp-ux-technical-scope.md), [technical-architecture-plan.md](technical-architecture-plan.md).
> **Sister docs:** [full-development-roadmap.md](full-development-roadmap.md), [product-feature-matrix.md](product-feature-matrix.md), [admin-and-operations-plan.md](admin-and-operations-plan.md), [task-tracker.md](task-tracker.md), [agent-execution-rules.md](agent-execution-rules.md).
> **Status of code:** No application code is to be modified by the act of writing this doc. **No SQL migrations to be run.** Code samples here are illustrative only.

---

## 1. Overview

This document defines:

1. The **entities** the platform tracks across MVP → Phase 14, with relationships and phase-of-introduction.
2. The **API surface** (endpoints, methods, auth requirements, role access, phase) that operates on those entities.

> **Migration discipline.** All schema work is additive in one deploy and destructive in a later deploy. Any change goes through `src/lib/db.ts`’s idempotent migration path. **Never** rename + drop in a single release.

---

## 2. Entities

Legend: **Phase** = first introduction; **MVP?** = Yes if needed at or before Phase 7 launch.

### 2.1 Identity & access

| Entity | Purpose | Key Fields | Relationships | Phase | MVP? | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `users` | Single account record per human/operator | `id`, `email` (unique, lowercased), `password_hash`, `role` ∈ {contestant, referee, admin, super_admin (P14), moderator (P8), producer (P10), mentor (P13), sponsor (P13), support (P14), audience (P8)}, `full_name`, `email_verified_at`, `last_login_at`, `created_at` | 1:1 with `contestant_profiles`; 1:N with `audit_logs`, `submission_assignments`, etc. | 0 (exists) | Yes | Extend role enum incrementally as phases land |
| `password_reset_tokens` | Forgot-password tokens | `user_id`, `token` (hashed), `expires_at`, `used_at` | belongs to `users` | 2 | Yes | One-time, 30-min expiry |
| `email_verification_tokens` | Verify-email tokens | `user_id`, `token`, `expires_at`, `used_at` | belongs to `users` | 7 | P1 | Phase 7 |
| `audience_users` | Optional separate identity space for fans | `id`, `email`, `password_hash`, `display_name`, `phone_verified_at`, `created_at` | distinct from `users` (avoids confusing a fan with a contestant) | 8 | No | Phase 8 |
| `device_tokens` | Push tokens for mobile | `id`, `user_id`, `platform` ∈ {ios, android}, `token`, `created_at` | belongs to `users` (or `audience_users`) | 12 | No | Phase 12 |

### 2.2 Contestant application & evaluation

| Entity | Purpose | Key Fields | Relationships | Phase | MVP? | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `contestant_profiles` *(currently `contestants`)* | Application data | `id` (6-digit numeric), `user_id`, `stage_name`, `phone`, `dob`, `age`, `city`, `country`, `music_category`, `talent_type`, `bio`, `social_ig`, `social_tt`, `social_yt`, `agreed_to_rules_at`, `agreed_to_rights_at`, `agreed_age_at`, `status`, `created_at` | 1:1 with `users`; 1:N with `submissions`, `payments`, `progress_steps` | 2 (extend existing `contestants`) | Yes | Don’t rename the table in MVP — extend in place |
| `applications` | Optional record of multi-season applications | `id`, `contestant_profile_id`, `season_id`, `status`, `applied_at` | belongs to `contestant_profiles`, `seasons` | 10 | No | Until then, season is implicit (one season at a time) |
| `progress_steps` | Per-contestant pipeline (registered → result) | composite `(contestant_id, step_key)`, `label`, `done`, `done_at`, `ord` | belongs to `contestant_profiles` | 0 (exists) | Yes | Refresh labels for show |
| `submissions` | Audition entries | `id`, `contestant_id`, `title`, `category`, `video_url`, `cloudinary_public_id`, `thumbnail_url`, `duration_sec`, `format`, `size_bytes`, `width`, `height`, `status` ∈ {pending, approved, rejected, flagged, superseded}, `notes`, `supersedes_id`, `created_at` | belongs to `contestant_profiles`; 1:N with `scores`, `submission_assignments`, `score_notes`, `media_clips` (Phase 11) | 0 (exists; extend in 3) | Yes | Add Cloudinary fields + `superseded` status |
| `submission_media` | Multiple takes / audio versions | `id`, `submission_id`, `kind` ∈ {video, audio, image}, `url`, `public_id`, `created_at` | belongs to `submissions` | 11 | No | Future-proofing |
| `submission_assignments` | Which referee owns which submission | composite `(submission_id, referee_user_id)`, `assigned_at`, `assigned_by_user_id` | links `submissions` × `users` (referee) | 5 | Yes | New for Phase 5 |
| `referee_reviews` | Header per (submission, referee) review | `id`, `submission_id`, `referee_user_id`, `decision` ∈ {approved, rejected, flagged, scored_only}, `decided_at` | links `submissions` × `users` | 5 | Yes | One row per (submission, referee). Optional; `scores` + `score_notes` already cover the data |
| `scores` *(per-criterion)* | Score rows | `id`, `submission_id`, `referee_user_id`, `criterion`, `points`, `max_points`, `created_at`, UNIQUE (`submission_id`, `referee_user_id`, `criterion`) | belongs to `submissions`, `users` | 0 (exists) | Yes | Idempotent upsert |
| `score_notes` | Notes per (submission, referee) | composite `(submission_id, referee_user_id)`, `private_notes`, `public_notes` (Phase 5), `updated_at` | same as `scores` | 0 (exists; extend) | Yes | Add `public_notes` |
| `result_codes` | Optional separate lookup tokens | – | – | – | No | Stick with `contestant_profiles.id` (6-digit) for MVP. Only add if we ever decouple ID from the application |

### 2.3 Payments

| Entity | Purpose | Key Fields | Relationships | Phase | MVP? | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `payments` | Each payment intent | `id`, `contestant_id`, `amount_cents`, `currency`, `provider`, `provider_ref`, `status` ∈ {pending, succeeded, failed, refunded}, `created_at`, `updated_at` | belongs to `contestant_profiles` | 0 (exists) | Yes | Existing |
| `payment_events` | Webhook + override events | `id`, `payment_id`, `actor_user_id` (nullable for webhook), `kind` ∈ {init, webhook, override, refund_request, refund_complete}, `payload` (jsonb), `created_at` | belongs to `payments` | 4 | Yes | Replaces ad-hoc audit on payments |

### 2.4 Operations

| Entity | Purpose | Key Fields | Relationships | Phase | MVP? | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `audit_logs` | Action history | `id`, `actor_user_id`, `target_type`, `target_id`, `action`, `payload` (jsonb), `created_at` | – | 6 | Yes | Read-only from app |
| `settings` | Runtime toggles | `key` (PK), `value` (jsonb), `updated_by_user_id`, `updated_at` | – | 6 | Yes | `registration_open`, `submissions_open`, `fee_required_at`, `fee_cents`, `current_round` |
| `notifications` | Per-user notification feed | `id`, `user_id`, `kind`, `title`, `body`, `link`, `read_at`, `created_at` | belongs to `users` | 7 | P1 | Optional in MVP |
| `support_messages` *(currently `contact_messages`)* | Inbound contact | `id`, `name`, `email`, `topic`, `message`, `handled`, `handled_by_user_id`, `handled_at`, `created_at` | – | 0 (exists; extend) | Yes | Add `handled_by_user_id`, `handled_at` |

### 2.5 Public + audience (Phase 8+)

| Entity | Purpose | Key Fields | Relationships | Phase | MVP? | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `public_contestant_profiles` | Materialised view of public-safe fields | `contestant_id`, `stage_name`, `city`, `country`, `category`, `bio`, `social_ig`, `social_tt`, `social_yt`, `published_at` | from `contestant_profiles` | 8 | No | Could be a view or a denormalised table |
| `likes` | Persisted likes | `audience_user_id`, `target_type`, `target_id`, `created_at`, UNIQUE (`audience_user_id`, `target_type`, `target_id`) | links `audience_users` × any target | 8 | No | – |
| `comments` | Threaded or flat | `id`, `audience_user_id`, `target_type`, `target_id`, `body`, `parent_comment_id?`, `status` ∈ {visible, hidden, removed}, `created_at` | links `audience_users` × any target | 8 | No | – |
| `follows` | Audience follows contestant | `audience_user_id`, `contestant_id`, `created_at` | – | 8 | No | – |
| `moderation_queue` | Flagged content | `id`, `target_type`, `target_id`, `flagged_by_user_id`, `reason`, `status` ∈ {pending, dismissed, actioned}, `created_at`, `actioned_by_user_id`, `actioned_at` | – | 8 | No | – |

### 2.6 Voting (Phase 9)

| Entity | Purpose | Key Fields | Relationships | Phase | MVP? | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `votes` | Per-vote record | `id`, `audience_user_id`, `target_contestant_id`, `round_id`, `weight`, `cost_cents`, `created_at` | belongs to `audience_users`, `rounds` | 9 | No | Anti-fraud: rate-limited |
| `vote_audit_logs` | Voting forensic log | `id`, `vote_id`, `ip`, `user_agent`, `signal_score`, `created_at` | belongs to `votes` | 9 | No | – |
| `rounds` | Voting / scoring rounds | `id`, `season_id`, `kind` ∈ {audition, qualifier, semifinal, final}, `opens_at`, `closes_at`, `status` | belongs to `seasons` | 9–10 | No | – |

### 2.7 Episodes / seasons (Phase 10)

| Entity | Purpose | Key Fields | Relationships | Phase | MVP? | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `seasons` | One per season | `id`, `name`, `slug`, `starts_at`, `ends_at`, `status` ∈ {planned, live, archived} | – | 10 | No | – |
| `episodes` | Episodes inside a season | `id`, `season_id`, `number`, `title`, `slug`, `synopsis`, `aired_at`, `published_at`, `status` ∈ {draft, published, archived} | belongs to `seasons` | 10 | No | – |
| `challenges` | Per-episode challenges | `id`, `episode_id`, `title`, `description`, `category`, `created_at` | belongs to `episodes` | 10 | No | – |
| `performances` | Stage performance instances | `id`, `episode_id`, `challenge_id`, `contestant_id`, `media_clip_id?`, `score?`, `eliminated` (bool), `performed_at` | links `episodes` × `contestant_profiles` × `media_clips` | 10 | No | – |
| `eliminations` | Optional cleaner record of who was eliminated when | `id`, `season_id`, `episode_id`, `contestant_id`, `reason`, `decided_by_user_id`, `created_at` | – | 10 | No | – |

### 2.8 Media (Phase 11)

| Entity | Purpose | Key Fields | Relationships | Phase | MVP? | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `media_clips` | Distributable clips / highlights | `id`, `kind` ∈ {audition, performance, highlight, mentor, behind_scenes}, `source_id` (e.g., performance_id), `title`, `provider` (cloudinary/mux/bunny), `provider_id`, `hls_url`, `thumbnail_url`, `duration_sec`, `published_at`, `status` ∈ {draft, published, archived} | links to performances / submissions | 11 | No | – |
| `watchlist` | Saved clips per fan | `audience_user_id`, `media_clip_id`, `saved_at`, UNIQUE (`audience_user_id`, `media_clip_id`) | belongs to `audience_users` × `media_clips` | 11 | No | – |

### 2.9 Mentors / sponsors (Phase 13)

| Entity | Purpose | Key Fields | Relationships | Phase | MVP? | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `mentors` | Celebrity mentors | `id`, `user_id?`, `display_name`, `bio`, `photo_url`, `socials`, `status` | – | 13 | No | – |
| `mentor_assignments` | Mentor → contestant | `mentor_id`, `contestant_id`, `season_id`, `created_at` | – | 13 | No | – |
| `mentor_notes` | Notes from mentors to contestants | `id`, `mentor_id`, `contestant_id`, `note`, `created_at` | – | 13 | No | – |
| `sponsors` | Sponsor brand record | `id`, `name`, `logo_url`, `tier`, `contract_start`, `contract_end`, `status` | – | 13 | No | – |
| `sponsor_campaigns` | Specific placements | `id`, `sponsor_id`, `episode_id?`, `placement` ∈ {banner, sponsored_challenge, branded_clip}, `assets`, `starts_at`, `ends_at` | belongs to `sponsors`, `episodes` | 13 | No | – |

---

## 3. Entity-relationship summary (high level)

```
users
 ├──< contestant_profiles >── progress_steps
 │         │
 │         ├──< submissions >── submission_media
 │         │      │
 │         │      ├──< scores
 │         │      ├──< score_notes
 │         │      ├──< submission_assignments >── users(referee)
 │         │      └──< media_clips (Phase 11)
 │         │
 │         ├──< payments >── payment_events
 │         └──< applications (Phase 10)
 │
 ├──< password_reset_tokens
 ├──< email_verification_tokens
 ├──< audit_logs
 └──< notifications

audience_users (Phase 8)
 ├──< likes
 ├──< comments
 ├──< follows
 ├──< votes (Phase 9)
 └──< watchlist (Phase 11)

seasons (Phase 10)
 ├──< episodes
 │     ├──< challenges
 │     ├──< performances >── contestant_profiles
 │     └──< sponsor_campaigns (Phase 13)
 └──< rounds

mentors (Phase 13) ──< mentor_assignments >── contestant_profiles
sponsors (Phase 13) ──< sponsor_campaigns >── episodes
```

---

## 4. API areas

### 4.1 Auth APIs

| API Area | Endpoint | Method | Purpose | Auth Required | Role Access | Phase | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Auth | `/api/auth/register` | POST | Create user + contestant + 6-digit ID + JWT cookie | No | Public | 0 (exists; extend in 2) | Validate consents |
| Auth | `/api/auth/login` | POST | Email + password → cookie | No | Public | 0 (exists) | Rate-limited |
| Auth | `/api/auth/logout` | POST | Clear cookie | Yes | All | 0 (exists) | – |
| Auth | `/api/auth/me` | GET | Session + contestant DTO + latestPayment | Optional | Public (returns nulls if no session) | 0 (exists) | – |
| Auth | `/api/auth/forgot-password` | POST | Issue reset token | No | Public | 2 | Rate-limited |
| Auth | `/api/auth/reset-password` | POST | Consume token + set new password | No | Public | 2 | – |
| Auth | `/api/auth/verify-email` | POST | Verify email | Yes | Contestant | 7 | – |
| Auth | `/api/v1/auth/refresh` | POST | Mobile refresh token | Yes (refresh token) | Mobile | 12 | – |

### 4.2 Contestant APIs

| API Area | Endpoint | Method | Purpose | Auth Required | Role Access | Phase | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Contestant | `/api/contestants/me` | GET | Own profile | Yes | Contestant | 2 | – |
| Contestant | `/api/contestants/me` | PATCH | Edit safe fields | Yes | Contestant | 2 | Cannot change DOB / consents |
| Contestant | `/api/contestants/me/withdraw` | POST | Soft-delete | Yes | Contestant | 2 | – |
| Contestant | `/api/contestants/me/advance` | POST | **Demo helper — REMOVE** | Yes | Contestant | – | Drop in Phase 1 |
| Contestant | `/api/contestants/[id]` | GET | Public 6-digit lookup | No | Public | 0 (exists; harden in 0/6) | Rate-limited; reduced PII for anonymous |

### 4.3 Submission APIs

| API Area | Endpoint | Method | Purpose | Auth Required | Role Access | Phase | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Submission | `/api/submissions` | GET | Own submissions + Cloudinary upload intent | Yes | Contestant | 0 (exists) | – |
| Submission | `/api/submissions` | POST | Create new submission | Yes | Contestant | 0 (exists; extend in 3) | Add Cloudinary fields |
| Submission | `/api/submissions/[id]` | PATCH | Replace title or supersede | Yes | Contestant (own only) | 3 | New |
| Submission | `/api/submissions/[id]/status` | PATCH | Approve / reject / flag | Yes | Referee, Admin | 5 | New |
| Submission | `/api/submissions/[id]/assignments` | GET | List assignments | Yes | Admin | 6 | – |
| Submission | `/api/submissions/[id]/assignments` | POST | Assign referees | Yes | Admin | 6 | – |
| Submission | `/api/submissions/[id]/assignments/[refId]` | DELETE | Unassign | Yes | Admin | 6 | – |
| Submission | `/api/showcase` | GET | Public approved feed | No | Public | 0 (exists; tighten in 1) | Only `status='approved'` |

### 4.4 Upload APIs

| API Area | Endpoint | Method | Purpose | Auth Required | Role Access | Phase | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Upload | `/api/uploads/intent` *(new dedicated endpoint)* | GET | Cloudinary signed intent | Yes | Contestant | 3 | Currently piggybacks on `GET /api/submissions` — extract for clarity |
| Upload | `/api/uploads/finalize` | POST | Server validates Cloudinary metadata + persists | Yes | Contestant | 3 | New |

### 4.5 Payment APIs

| API Area | Endpoint | Method | Purpose | Auth Required | Role Access | Phase | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Payment | `/api/payments/init` | POST | Issue intent | Yes | Contestant | 0 (exists) | – |
| Payment | `/api/payments/[id]` | GET | Poll status | Yes | Contestant (own), Admin | 0 (exists) | – |
| Payment | `/api/payments/webhook` | POST | Provider callback | No (HMAC) | Provider | 0 (exists) | Existing |
| Payment | `/api/admin/payments` | GET | List + filter | Yes | Admin | 6 | New |
| Payment | `/api/admin/payments/[id]` | PATCH | Override | Yes | Admin | 0 (exists; UI in 6) | – |
| Payment | `/api/admin/payments/[id]/refund` | POST | Mark refunded | Yes | Admin | 4 | New |

### 4.6 Referee APIs

| API Area | Endpoint | Method | Purpose | Auth Required | Role Access | Phase | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Referee | `/api/referee/queue` | GET | Assigned + status-aware queue | Yes | Referee, Admin | 0 (exists; rework in 5) | Filter by `submission_assignments` |
| Referee | `/api/referee/submissions/[id]` | GET | Detail with public/private notes | Yes | Referee, Admin | 5 | – |
| Referee | `/api/scores` | POST | Upsert per-criterion scores + notes | Yes | Referee, Admin | 0 (exists) | – |
| Referee | `/api/referee/reviews` | GET | History of own reviews | Yes | Referee | 5 | – |

### 4.7 Admin APIs

| API Area | Endpoint | Method | Purpose | Auth Required | Role Access | Phase | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Admin | `/api/admin/stats` | GET | KPIs | Yes | Admin | 0 (exists) | – |
| Admin | `/api/admin/contestants` | GET | List + filter | Yes | Admin | 0 (exists; extend in 6) | – |
| Admin | `/api/admin/contestants/[id]` | GET | Detail | Yes | Admin | 6 | – |
| Admin | `/api/admin/contestants/[id]/status` | PATCH | Status mutation | Yes | Admin | 6 | Audit-logged |
| Admin | `/api/admin/contestants/export.csv` | GET | CSV stream | Yes | Admin | 6 | – |
| Admin | `/api/admin/submissions` | GET | List + filter | Yes | Admin | 6 | – |
| Admin | `/api/admin/referees` | GET / POST / PATCH / DELETE | Manage referees | Yes | Admin | 6 | – |
| Admin | `/api/admin/assignments` | POST | Bulk assign | Yes | Admin | 6 | – |
| Admin | `/api/admin/results/round` | POST | Publish round | Yes | Admin | 6 | – |
| Admin | `/api/admin/settings` | GET / PATCH | Toggles | Yes | Admin | 6 | Audit-logged |
| Admin | `/api/admin/audit-logs` | GET | Read | Yes | Admin | 6 | Filterable |
| Admin | `/api/admin/messages` | GET / PATCH | Contact inbox | Yes | Admin | 6 | `contact_messages` |
| Admin | `/api/admin/moderation` | GET / PATCH | Flag actions | Yes | Admin / Moderator | 8 | Phase 8 |

### 4.8 Result-checker APIs

| API Area | Endpoint | Method | Purpose | Auth Required | Role Access | Phase | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Result | `/api/contestants/[id]` | GET | 6-digit lookup | No | Public | 0 (exists) | Rate-limited; reduced PII anonymous |
| Result | `/api/result/by-email-dob` *(optional)* | POST | Alt path | No | Public | 6 | P2 |

### 4.9 Audience APIs (Phase 8+)

| API Area | Endpoint | Method | Purpose | Auth Required | Role Access | Phase | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Audience | `/api/audience/auth/register` | POST | Fan account creation | No | Public | 8 | – |
| Audience | `/api/audience/auth/login` | POST | – | No | Public | 8 | – |
| Audience | `/api/audience/me` | GET | Fan profile | Yes | Audience | 8 | – |
| Audience | `/api/audience/likes` | POST / DELETE | Persisted like | Yes | Audience | 8 | – |
| Audience | `/api/audience/comments` | GET / POST / PATCH / DELETE | Comments | Yes (post) / No (read) | Audience / Public | 8 | Moderation-aware |
| Audience | `/api/audience/follows` | POST / DELETE | Follow contestant | Yes | Audience | 8 | – |
| Audience | `/api/audience/watchlist` | GET / POST / DELETE | Watchlist | Yes | Audience | 11 | – |
| Audience | `/api/contestants/public/[slug]` | GET | Public profile | No | Public | 8 | – |

### 4.10 Voting APIs (Phase 9)

| API Area | Endpoint | Method | Purpose | Auth Required | Role Access | Phase | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Voting | `/api/votes` | POST | Cast vote | Yes (verified) | Audience | 9 | Anti-fraud |
| Voting | `/api/votes/me` | GET | My recent votes | Yes | Audience | 9 | – |
| Voting | `/api/admin/voting/rounds` | GET / POST / PATCH | Round mgmt | Yes | Admin | 9 | – |
| Voting | `/api/admin/voting/audit` | GET | Vote audit | Yes | Admin / Super-admin | 9 | – |

### 4.11 Episode APIs (Phase 10)

| API Area | Endpoint | Method | Purpose | Auth Required | Role Access | Phase | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Episode | `/api/episodes` | GET | Public list | No | Public | 10 | Published only |
| Episode | `/api/episodes/[slug]` | GET | Public detail | No | Public | 10 | – |
| Episode | `/api/admin/seasons` | GET / POST / PATCH | Season CRUD | Yes | Admin / Producer | 10 | – |
| Episode | `/api/admin/episodes` | GET / POST / PATCH | Episode CRUD | Yes | Admin / Producer | 10 | – |
| Episode | `/api/admin/performances` | GET / POST / PATCH | Performance scheduling | Yes | Admin / Producer | 10 | – |
| Episode | `/api/admin/eliminations` | POST | Mark elimination | Yes | Admin / Producer | 10 | Audit-logged |

### 4.12 Notification APIs

| API Area | Endpoint | Method | Purpose | Auth Required | Role Access | Phase | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Notification | `/api/notifications` | GET | My feed | Yes | Any user | 7 | – |
| Notification | `/api/notifications/[id]/read` | POST | Mark read | Yes | Any user | 7 | – |
| Notification | `/api/notifications/preferences` | GET / PATCH | Opt-in/out | Yes | Any user | 7 | – |
| Notification | (server) email-send wrappers | – | Internal | – | – | 7 | Postmark / Resend |
| Notification | `/api/v1/devices` | POST | Register device for push | Yes | Mobile user | 12 | – |

### 4.13 Chatbot / Support APIs

| API Area | Endpoint | Method | Purpose | Auth Required | Role Access | Phase | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Chatbot | `/api/chatbot` | POST | EN/AM static + LLM fallback | No | Public | 0 (exists) | – |
| Support | `/api/contact` | POST | Inbound message | No | Public | 0 (exists) | – |
| Support | `/api/support/tickets` | GET / POST / PATCH | Ticket mgmt | Yes | Support / Admin | 14 | – |

### 4.14 Analytics APIs

| API Area | Endpoint | Method | Purpose | Auth Required | Role Access | Phase | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Analytics | `/api/admin/stats` | GET | KPIs | Yes | Admin | 0 (exists) | – |
| Analytics | `/api/admin/funnel` | GET | Apply → submit → pay | Yes | Admin | 7 | – |
| Analytics | `/api/admin/cohorts` | GET | Retention | Yes | Admin / Super-admin | 14 | – |
| Analytics | `/api/sponsor/analytics` | GET | Aggregate-only | Yes | Sponsor | 13 | No PII |

---

## 5. API design principles

1. **Envelope.** All app responses use `{ ok: true, data: ... }` or `{ ok: false, error: "..." }` (existing pattern in [src/lib/api.ts](../src/lib/api.ts)). Keep.
2. **Validation.** Every body / query is parsed by a Zod schema via `parseJson(req, Schema)`. No untyped bodies.
3. **RBAC.** Every privileged route calls `requireRole(...)` server-side, in addition to edge middleware.
4. **Rate limiting.** Sensitive endpoints (`/api/auth/login`, `/api/contestants/[id]`, `/api/auth/forgot-password`, voting) use a shared rate-limit primitive (e.g., Upstash Ratelimit). Same primitive everywhere.
5. **Idempotency.** Mutations that may be retried (uploads, payments) accept an idempotency key.
6. **Pagination.** List endpoints accept `?limit=…&offset=…` (or cursor in Phase 11+). Default limit 100, max 200.
7. **CSRF.** Cookie-auth POSTs require a CSRF token or `Sec-Fetch-Site` check (Phase 6).
8. **Audit.** Any state change driven by an admin or referee writes an `audit_logs` row server-side.
9. **Versioning.** Web stays on the unversioned `/api/*` tree. Mobile consumes `/api/v1/*` (Phase 12).
10. **Errors.** No stack traces in responses. Map known errors via `ApiError`; unknown errors → `500 Internal server error`.

---

## 6. DTO conventions

- **Server DTOs** live in `src/lib/dto.ts` and consume DB rows.
- **Client-safe DTO types** mirror in `src/lib/dto-types.ts` (no DB imports).
- **Public vs private** DTOs are explicit and named (`ContestantDTO` vs `PublicContestantDTO`). The result-checker should never return the private DTO.
- **Phase 12 mobile** consumes versioned DTOs that may differ from web — keep mobile DTO types under `src/lib/v1-dto-types.ts`.

---

## 7. Migration plan summary

| Phase | Schema deltas |
| --- | --- |
| 0 | None (cleanup only) |
| 2 | Extend `contestants` with `dob`, `country`, `social_*`, three consent timestamps; add `password_reset_tokens` |
| 3 | Extend `submissions` with `cloudinary_public_id`, `format`, `size_bytes`, `width`, `height`, `superseded` status, `supersedes_id` |
| 4 | Add `payment_events`; (no destructive change to `payments`) |
| 5 | Add `submission_assignments`; extend `score_notes` with `public_notes` |
| 6 | Add `audit_logs`, `settings`; extend `contact_messages` with `handled_by_user_id`, `handled_at` |
| 7 | Add `email_verification_tokens`, `notifications` |
| 8 | Add `audience_users`, `likes`, `comments`, `follows`, `moderation_queue`; add `audience` to user role enum (or keep `audience_users` separate) |
| 9 | Add `votes`, `vote_audit_logs`, `rounds` |
| 10 | Add `seasons`, `episodes`, `challenges`, `performances`, `eliminations`, `applications` |
| 11 | Add `media_clips`, `submission_media`, `watchlist` |
| 12 | Add `device_tokens` |
| 13 | Add `mentors`, `mentor_assignments`, `mentor_notes`, `sponsors`, `sponsor_campaigns` |
| 14 | Add `support_tickets`, `support_ticket_messages` |

---

*End of Data Model and API Plan.*
