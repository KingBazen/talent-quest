# Acceptance criteria

Each criterion is testable in QA. Reference IDs match user stories in
[`USER_STORIES.md`](./USER_STORIES.md).

## Phase 1 (this MVP)

### A-P1-1 Marketing pages

- Homepage, How-it-works, Categories, Upload Guide, Showcase, FAQ, and Contact
  render without runtime errors at 360 px, 768 px, and 1440 px widths.
- All pages pass Lighthouse mobile performance ≥ 85 (uncached preview deploy).
- All interactive elements are reachable by keyboard alone.

### A-P1-2 Registration

- The 3-step form blocks progress until the current step's fields validate.
- Submitting generates a 6-digit numeric ID (random, between 100000 and
  999999) that is also the digit count constraint.
- The contestant record persists in `localStorage` under `tq:contestants` and
  is selectable as `current` in `localStorage` under `tq:current-contestant`.
- The success card displays the ID, copy button, and links to profile / upload
  guide / result checker.

### A-P1-3 Profile

- With a registered contestant, `/profile` shows the progress timeline,
  category emoji, demo score preview, and schedule.
- "Simulate next step" toggles the next step from `pending` to `done` and
  updates the contestant's `status` accordingly.
- "Clear demo" empties the localStorage keys after a confirm dialog.

### A-P1-4 Result checker

- Submitting the contestant's own ID resolves to their profile preview.
- An unknown ID renders the "no match" card with action buttons.
- Input is restricted to digits and capped at 6 characters.

### A-P1-5 Showcase

- Filter chips immediately update both Reels and Grid views.
- Reels view fills 80vh on mobile and snaps per clip.
- Grid view shows a hero clip and a responsive grid of remaining clips.

### A-P1-6 FAQ + Stage Bot

- Search filters the accordion by keyword across `q`, `a`, `qAm`, `aAm`, tags.
- EN/AM toggle swaps text on every entry where Amharic is present.
- Stage Bot widget greets in English by default, switches to Amharic when
  toggled, and routes Amharic-script input to the AM answerer automatically.
- Quick-reply chips are clickable and produce an answer.

### A-P1-7 Admin demo

- KPI cards render with mock numbers.
- Recent registrations table is searchable.
- Categories tab shows weighted progress bars summing to ~100 %.
- Payments tab shows the "Phase 2" lock card; no real data is referenced.

### A-P1-8 Referee demo

- The judging console computes the live total as the sum of five sliders.
- Submitting marks the current clip as reviewed and advances to the next clip
  in the queue.
- Sliders accept both range and star clicks.

### A-P1-9 Demo labelling

- Every page that mentions payments, real authentication, video upload, judge
  scoring, or AI chatbot displays a visible "demo / future-production" badge.
- The site-wide demo banner is present on all routes.

## Phase 2 (production system)

### A-P2-1 Authentication (refs C-1, R-1, A-1)

- Sign-up, login (email and phone OTP), password reset, refresh, and 2FA
  enrolment all return the documented error envelope on validation failure.
- A user with `role=contestant` cannot reach `/api/v1/judge/*` or
  `/api/v1/admin/*` even with a valid token.
- Login rate-limit triggers after 5 failures from one IP within 1 minute.

### A-P2-2 Contestant ID

- IDs are unique across the database (`UNIQUE` constraint on
  `contestants.public_id`).
- Each new contestant receives an ID within 200 ms p95.

### A-P2-3 Payments (ref C-6)

- Successful payment unlocks `submissions.upload-url` for the contestant.
- A duplicate webhook for the same `provider_ref` does not double-credit.
- Refund (admin) reverses the unlock and writes an `audit_logs` row.

### A-P2-4 Video upload (ref C-3)

- Files up to 500 MB upload successfully on a constrained 3G network within
  the 24 h resumable window.
- Provider webhook flips the submission to `ready` and emits the
  `submission.ready` notification within 5 minutes p95 of upload completion.

### A-P2-5 Judging (refs R-1, R-2, R-3)

- Each submission is assigned to ≥ 3 judges; the published score is the
  median.
- Judges cannot view scores submitted by other judges in the same round.
- Submitting a duplicate score for the same `(submission_id, judge_id)` is a
  conflict, not a duplicate row.

### A-P2-6 Result publishing (ref A-4)

- One admin action transitions the round to `published` and triggers SMS,
  email, and in-app notifications to all contestants in the round.
- Contestant profiles and the public Result Checker page reflect the new
  status within 30 seconds.

### A-P2-7 Showcase

- Only `submissions.status='approved'` clips appear in the public showcase.
- Filtering by category narrows the list server-side.

### A-P2-8 AI chatbot (ref V-3)

- Detects user language with ≥ 95 % accuracy on the bilingual eval set.
- Hands off to support when confidence is below the threshold rather than
  hallucinating.
- Citations to source FAQ entries are returned alongside the answer.

### A-P2-9 Security audit

- Pen-test report has no open Critical or High findings on launch day.
- Cookies are HTTP-only, Secure, and SameSite=Lax (or Strict where possible).
- CSP report-only mode is on for 14 days, then enforced.

### A-P2-10 Accessibility audit

- Manual + automated WCAG 2.1 AA scan on all public pages reports no
  Critical/High issues.
- All forms have associated labels and error announcements.
- Focus management on dialogs and route changes verified by screen reader.
