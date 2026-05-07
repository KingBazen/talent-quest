# Bling Records Show — Admin and Operations Plan

> **Document type:** Operational reference. How show staff actually run the season on the platform.
> **Read first:** [bling-records-show-mvp-ux-technical-scope.md](bling-records-show-mvp-ux-technical-scope.md), [full-ux-ecosystem-documentation.md](full-ux-ecosystem-documentation.md), [data-model-and-api-plan.md](data-model-and-api-plan.md).
> **Sister docs:** [full-development-roadmap.md](full-development-roadmap.md), [product-feature-matrix.md](product-feature-matrix.md), [technical-architecture-plan.md](technical-architecture-plan.md), [task-tracker.md](task-tracker.md), [agent-execution-rules.md](agent-execution-rules.md).
> **Status of code:** No application code is to be modified by the act of writing this doc.

---

## 1. Admin Roles

The platform recognises operator roles in increasing scope of authority. Roles are additive: a Super-Admin has every permission of an Admin.

| Role | Phase | Scope | Typical person |
| --- | --- | --- | --- |
| **Admin** | 6 (MVP) | All operational data: contestants, submissions, scores, payments, settings, audit logs. Cannot manage other admins. | Bling Records ops lead |
| **Super-Admin** | 14 | Manage admins, manage referees, override anything, invalidate sessions, run break-glass procedures. Ultimate authority on the platform. | Bling Records leadership (1–2 people max) |
| **Producer** | 10 | Plan rounds, schedule episodes / performances / mentor sessions. Cannot edit financials or change contestant identity fields. | Neo Studios production lead |
| **Moderator** | 8 | Review flagged submissions / comments. Hide / remove user content. Cannot mutate scoring or payments. | Bling Records community team |
| **Support Agent** | 14 | Read user accounts (limited PII), send messages, reset passwords through approved flow, escalate. Cannot mutate scoring or payments. | Bling Records support team |
| **Finance / Payment Manager** | 14 | View payments, refund, reconcile. Cannot change contestant or submission status. | Bling Records finance |

> **Rule of least privilege.** Every role is gated to the minimum scope it needs. Every action — by every role — is written to `audit_logs`.

---

## 2. Operations Workflows

Each workflow is described as: **trigger → steps → outcome → owner**.

### 2.1 Review new contestants

- **Trigger:** new contestant registration arrives.
- **Steps:**
  1. Admin opens `/admin/contestants` filtered to `status = registered`.
  2. Verifies basic completeness (DOB, consent, category).
  3. Optional: flags suspicious entries (duplicate phone, fake email).
- **Outcome:** No status change required — moves automatically to `submitted` once the contestant uploads.
- **Owner:** Admin.

### 2.2 Triage incoming submissions

- **Trigger:** contestant uploads / replaces audition.
- **Steps:**
  1. Admin opens `/admin/submissions` filtered to `status = pending`.
  2. Quick-watches first ~30 seconds; checks format / category fit.
  3. Either flips to `approved` (visible to referees) or `rejected` (with reason) or `flagged` (for moderation).
- **Outcome:** Submission is now in the referee queue or removed.
- **Owner:** Admin (Phase 6) or Moderator (Phase 8 once that role exists).

### 2.3 Assign referees

- **Trigger:** new approved submission OR weekly batch.
- **Steps:**
  1. Admin opens `/admin/assignments`.
  2. Picks 3–5 referees per submission according to panel rules (cross-region, cross-genre).
  3. Saves assignments → referees are notified by email (Phase 7).
- **Outcome:** `submission_assignments` rows created; referees see new items in their queues.
- **Owner:** Admin.

### 2.4 Monitor submissions

- **Trigger:** continuous.
- **Steps:**
  1. Admin opens `/admin/dashboard` for KPIs.
  2. Watches “reviewed % of submissions,” “avg score,” “oldest pending submission age.”
  3. Drills into outliers.
- **Outcome:** SLA on referee response is held.
- **Owner:** Admin.

### 2.5 Manage payments

- **Trigger:** payment events arrive (init, webhook, override).
- **Steps:**
  1. Admin opens `/admin/payments`.
  2. Filters `status = pending` older than 24 h.
  3. Looks up provider records (manually, until full Telebirr API ships).
  4. Flips status to `succeeded` / `failed` with reason.
- **Outcome:** Stuck payments don’t block contestants; reconciliation history audit-logged.
- **Owner:** Admin / Finance Manager.

### 2.6 Shortlist contestants

- **Trigger:** when a round closes, or by score threshold.
- **Steps:**
  1. Admin opens `/admin/results`.
  2. Filters by score band + category + region.
  3. Bulk-marks `shortlisted`.
  4. Confirms with founder before publish.
  5. Optionally moves payment requirement (`fee_required_at`) to `'apply'` for the next round.
- **Outcome:** Contestants’ statuses flip; status-change emails fire (Phase 7).
- **Owner:** Admin.

### 2.7 Publish results

- **Trigger:** at end of round.
- **Steps:**
  1. Admin opens `/admin/results`.
  2. Reviews proposed transitions.
  3. Hits **Publish round**.
  4. Public `/result-checker` reflects the new statuses.
- **Outcome:** Round is locked; further status changes require admin override.
- **Owner:** Admin (with founder approval).

### 2.8 Export data

- **Trigger:** weekly / on-demand.
- **Steps:**
  1. Admin opens `/admin/exports` or any list view.
  2. Applies filters.
  3. Clicks **Export CSV**.
- **Outcome:** Streamed CSV for offline analysis or partner reports.
- **Owner:** Admin / Finance / Producer.

### 2.9 Handle disputes

- **Trigger:** contestant complaint via `/contact` or email.
- **Steps:**
  1. Support / admin opens contestant detail.
  2. Reviews scores, audit logs, payment history.
  3. Replies via email; escalates to admin if needed.
  4. If valid: updates contestant status / refunds payment / replays scoring.
- **Outcome:** Contestant has a clear answer; audit log captures the change.
- **Owner:** Support → Admin (escalation).

### 2.10 Handle inappropriate content

- **Trigger:** user report or mod-queue auto-flag (Phase 14).
- **Steps:**
  1. Moderator opens `/admin/moderation`.
  2. Reviews flagged content.
  3. Decides: dismiss, hide, remove, ban user.
- **Outcome:** Content state updates; audit log captures decision + reason.
- **Owner:** Moderator (Phase 8+).

### 2.11 Manage episodes

- **Trigger:** Phase 10 onwards.
- **Steps:**
  1. Producer opens `/producer/episodes`.
  2. Drafts episode with title, synopsis, performances.
  3. Publishes when ready.
- **Outcome:** Public `/episodes/[slug]` becomes visible.
- **Owner:** Producer.

### 2.12 Manage mentors

- **Trigger:** Phase 13 onwards.
- **Steps:**
  1. Admin invites mentor; creates `mentors` row.
  2. Admin assigns mentor to contestants.
  3. Mentor logs in to `/mentor/contestants`, leaves notes.
- **Outcome:** Contestants receive mentor notes; admin can audit.
- **Owner:** Admin / Producer.

### 2.13 Manage sponsors

- **Trigger:** Phase 13 onwards.
- **Steps:**
  1. Admin creates sponsor record + campaign placements.
  2. Sponsor logs in to `/sponsor/dashboard` to view aggregate metrics.
- **Outcome:** Brand integration tracked + reportable.
- **Owner:** Admin / Sales (if added later).

### 2.14 Manage audience voting (Phase 9)

- **Trigger:** voting round opens.
- **Steps:**
  1. Admin opens `/admin/voting/rounds`.
  2. Configures round (eligible contestants, open/close timestamps, max votes per user).
  3. Monitors vote audit log for anomalies (rate-limit hits, geography clusters).
  4. Closes round; results auto-published.
- **Outcome:** Round results are tamper-evident and audit-logged.
- **Owner:** Admin / Super-Admin.

---

## 3. Admin Dashboard Requirements

### 3.1 Metrics shown

- Total contestants (with weekly delta).
- Submissions total + reviewed %.
- Avg score across all rounds.
- Payments gross / paid / pending.
- Category distribution.
- Oldest pending submission age (P1).
- Active referees in last 7 days (P1).

### 3.2 Tables

- Contestants table: ID, name, email, category, city, status, score, created_at.
- Submissions table: thumbnail, contestant, category, status, score (after 3 judges), created_at.
- Payments table: id, contestant, amount, status, provider_ref, updated_at.
- Referees table: name, email, assigned count, reviewed count, avg score, last active.
- Audit log table: actor, target, action, when (filterable by actor / target / action / date).

### 3.3 Filters

- Status (any of contestant / submission / payment statuses).
- Category, city, country (where applicable).
- Score band (e.g., 80–100, 60–79, 0–59, unscored).
- Date range.
- Free-text search (name, email, contestant ID, phone).

### 3.4 Search

- Single search bar on each list page.
- Searches: ID, name, email, city, phone (admin only).

### 3.5 Detail pages

- Contestant detail: identity, contact, application timeline, submissions (with player), scores, payments, audit log.
- Submission detail: video player, scores per criterion, public + private notes, status mutation actions.
- Payment detail: payment events, override action, refund action.

### 3.6 Status controls

- Every status mutation requires a **reason** field on downgrades (e.g., `submitted → eliminated`).
- Confirmations on destructive actions (refund, mass-status update).
- Audit log entry on every mutation.

### 3.7 Audit log viewer

- Filterable, paginated.
- Entries are **append-only**; no delete or edit from the UI.

### 3.8 Export tools

- Per-table CSV export with filter support.
- Export limited to 10,000 rows per call (paginate beyond).

---

## 4. Moderation Plan

### 4.1 Content flags

- Reports come from: user reports, auto-flag heuristics (Phase 14), admin manual flags.
- Flags accumulate on `moderation_queue` rows.

### 4.2 Report system

- Public-facing **Report** affordance on contestant pages (Phase 8) and comments.
- Reports include reason from a fixed list + free-text.

### 4.3 Video review

- For flagged audition videos, moderator reviews in `/admin/moderation` with the same in-app player as referees.
- Decision options: dismiss, mark `flagged` (visible to admin only), `rejected` (removed from queue + showcase), or escalate to admin.

### 4.4 Comment moderation (Phase 8)

- Hide (visible to author + moderator only) / remove (gone for all) / warn (DM to user) / ban (block account).
- All actions audit-logged.

### 4.5 User blocking (Phase 8)

- Audience users can block other audience users (their content hidden from each other).
- Admin can block any user; blocked users cannot register a new account with the same email/phone for 30 days.

---

## 5. Payment Operations

### 5.1 Payment verification

- Webhook signature is verified server-side via HMAC SHA-256 (existing).
- Manual override requires reason + audit log.

### 5.2 Manual reconciliation

- Daily Cron (Phase 11) flags `pending` payments older than 24 h.
- Admin reviews provider dashboard manually until full Telebirr API ships, then flips status.

### 5.3 Refund policy

- Refunds covered by `/refund-policy` page (Phase 7).
- Initiated only by admin / finance manager via the admin payment detail page.
- Two-step confirm: select reason → confirm.
- Provider integration may be manual at first (record refund as out-of-band), with `payments.status = refunded` set in our DB.

### 5.4 Payment status override

- Allowed transitions:
  - `pending → succeeded` (with reason).
  - `pending → failed` (with reason).
  - `succeeded → refunded` (with reason).
  - **Not allowed:** `succeeded → failed` (would imply removing money received).
- Every override produces a `payment_events` row.

### 5.5 AdmasPay webhook logs

- Every webhook delivery (success or failure) writes a `payment_events` row including raw payload (with secrets redacted).
- Admin can view per-payment timeline.

---

## 6. Production Operations (Phase 10+)

### 6.1 Episode planning

- Producer drafts episodes in `/producer/episodes` while still in `status = draft`.
- Draft visible only to producers + admins.
- Publish flips `status = published`; public listings refresh on the next ISR revalidation.

### 6.2 Performance scheduling

- Each performance ties: episode + challenge + contestant + (optional) media clip + score.
- Schedule view: calendar by day; producer can drag/drop performances.

### 6.3 Contestant progression

- After each challenge / round, admins or producers mark contestants as advancing or eliminated.
- Status flows: `shortlisted → advanced → … → finalist → winner` (or `eliminated` at any point).

### 6.4 Elimination tracking

- `eliminations` table records when, why, by whom.
- Public `/result-checker` reflects the new status.
- Public `/contestants/[slug]` page (Phase 8) shows a journey timeline.

### 6.5 Mentor appearances

- Mentor session = scheduled time + episode reference + contestant list.
- Mentor logs in to `/mentor/sessions` to read brief and write notes after the session.

### 6.6 Media release schedule

- Phase 11 introduces a clip publish queue.
- Producer marks clips `status = scheduled` with a `published_at` timestamp.
- Cron job flips them to `published` at the scheduled time.

---

## 7. Support Operations

### 7.1 FAQ

- Static EN/AM FAQ (existing) — keep updated to match Bling Records Show specifics.

### 7.2 Contact form

- Existing `/contact` form writes to `support_messages` (renamed from `contact_messages`).
- Admin / support reads at `/admin/messages`; can mark `handled` with a note.

### 7.3 Chatbot handoff

- Static matcher → LLM fallthrough (existing).
- Phase 14: chatbot can hand off to a human ticket if a question goes unanswered after 2 attempts.

### 7.4 Support tickets (Phase 14)

- New `support_tickets` + `support_ticket_messages` tables.
- Support agent works the queue; escalates to admin / finance if needed.
- Audit logs record all replies and status changes.

---

## 8. Risk and Control Matrix

| Risk | Operational Impact | Control | Owner | Phase |
| --- | --- | --- | --- | --- |
| Leaked admin / referee credentials | Full data compromise | Force password reset on Phase 0; rotate JWT secret; super-admin can revoke sessions (Phase 14) | Founder + Implementation Agent | 0, 14 |
| Stuck pending payments | Contestants blocked from advancing | 24-h Cron flag + manual override flow | Admin / Finance | 4 |
| Forged AdmasPay webhook | Fake payment confirmations | HMAC verify + 401 on bad signature (existing) | Implementation Agent | 0 (verify) |
| Referee bias / collusion | Unfair scoring | Cross-region panels; audit log; calibration tool (Phase 14) | Admin | 5, 14 |
| Brute-force on `/result-checker` | PII leak | Rate-limit + reduced PII for anonymous lookups | Implementation Agent | 0 |
| Public Reels likes are fake | Trust collapse | Drop in MVP; only ship persisted likes (Phase 8) | Implementation Agent | 1, 8 |
| Vote fraud (Phase 9) | Show legitimacy ruined | Identity verify (phone OTP) + per-IP/user/device rate-limit + audit log | Implementation Agent + Founder | 9 |
| Inappropriate content during audition season | Brand damage | Moderation queue + admin review before showcase | Moderator (Phase 8) | 8 |
| Refund disputes | Trust + chargebacks | `/refund-policy` page, refund flow, audit log | Finance + Legal | 7 |
| Scope creep in admin tools | MVP slips | Feature matrix + agent execution rules | Implementation Agent + Founder | All |
| Privilege escalation (admin → super-admin actions) | Insider risk | Role separation in Phase 14; admin cannot create admins | Super-Admin | 14 |
| Mass status updates by accident | Many contestants affected wrongly | Bulk action confirms + reason field + audit log | Admin | 6 |
| Lost / stolen device with admin session | Session hijack | Short-lived JWT + device session list (Phase 14) | Implementation Agent | 14 |
| Production broadcast date claims that aren’t real | PR / legal risk | Founder approves any broadcast date claim before publish | Founder + Producer | 1, 10 |
| Sponsor sees per-user data | Privacy violation | Sponsor APIs aggregate-only, contractually | Implementation Agent | 13 |
| GDPR-equivalent data requests | Compliance | Export + delete flow (Phase 7 docs, Phase 14 implementation) | Legal + Implementation Agent | 7, 14 |

---

## 9. Operational SLAs (proposed; founder to confirm)

| Surface | SLA |
| --- | --- |
| Submission triage (admin) | ≤ 24 h after upload |
| Referee assignment | ≤ 48 h after admin approval |
| Referee scoring | ≤ 7 days after assignment |
| Payment reconciliation | ≤ 24 h after webhook anomaly |
| Support reply (Phase 7) | ≤ 48 h business hours |
| Status email delivery (Phase 7) | ≤ 5 min after status change |
| Audit log write | Synchronous (every mutation) |

---

## 10. Operational checklists

### 10.1 New season open checklist

1. Settings: `registration_open = true`, `submissions_open = true`, `current_round = 1`, `fee_required_at = 'shortlist'`.
2. Confirm referee panel staffed and assignment rules documented.
3. Run a smoke test of register → upload → score → result-check → payment.
4. Confirm legal pages reflect this season’s rules + dates.
5. Confirm `/judges` page lists confirmed judges.
6. Confirm transactional emails fire (Phase 7).
7. Founder + legal sign-off.

### 10.2 New round close checklist

1. Lock `submissions_open = false` for the round.
2. Run referee SLA report; chase outstanding scores.
3. Bulk-shortlist via `/admin/results`.
4. Founder approves shortlist.
5. Publish round → status emails fire.
6. Open next round (if any) with updated settings.

### 10.3 Incident response checklist

1. Determine severity (S1 outage, S2 functional bug, S3 cosmetic).
2. S1: notify founder + super-admin within 15 min.
3. S1: temporary mitigation (e.g., disable affected endpoint).
4. Audit log + Sentry capture root cause.
5. Post-mortem within 72 h for all S1 / S2.
6. Long-term fix tracked in [task-tracker.md](task-tracker.md).

---

*End of Admin and Operations Plan.*
