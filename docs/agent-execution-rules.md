# Bling Records Show — Agent Execution Rules

> **Document type:** Operating manual for **future AI coding agents** working on this codebase.
> **Read first:** [task-tracker.md](task-tracker.md) (state), [full-development-roadmap.md](full-development-roadmap.md) (sequencing), [bling-records-show-mvp-ux-technical-scope.md](bling-records-show-mvp-ux-technical-scope.md) (security + scope), and the doc most relevant to your task.
> **This file does not change with the work — only when the rules themselves change.**

If something here conflicts with a later human instruction, the **human instruction wins**, but you must call out the conflict in your response.

---

## 0. The five things that override everything else

1. **Phase 0 (security) blocks every other phase.** Do not touch features until Phase 0 is `DONE` in [task-tracker.md](task-tracker.md).
2. **Never commit secrets.** Not in code, not in tests, not in docs, not in fixtures.
3. **Never fake progress.** A task is `DONE` only when its acceptance criteria are demonstrably met.
4. **Read the docs before coding.** Specifically, the doc that owns the area you’re changing.
5. **Update [task-tracker.md](task-tracker.md) before and after work.** Always.

---

## 1. General Rules

1. **Read docs before coding.** At minimum: this file, [task-tracker.md](task-tracker.md), and the relevant area doc (e.g., [data-model-and-api-plan.md](data-model-and-api-plan.md) for DB / API work).
2. **Update the task tracker.**
   - Before starting: flip task to `IN PROGRESS`, set `Assigned Agent`.
   - After finishing: flip to `NEEDS REVIEW` (if a human / second agent must review) or `DONE` (only if acceptance criteria are met).
   - Update the **Current Progress Summary** in [task-tracker.md](task-tracker.md).
3. **Do not build out-of-scope features.** Out-of-scope is defined in §6 and in §8 of [bling-records-show-mvp-ux-technical-scope.md](bling-records-show-mvp-ux-technical-scope.md).
4. **Do not create fake UI.** Every visible button, badge, count, like, vote, or notification icon must be backed by a real persisted state. Empty states are better than fictional ones.
5. **Preserve working foundations.** Do not rewrite `auth`, `RBAC`, `scoring`, or the result checker — refine them in place.
6. **Keep TypeScript clean.** `npm run type-check` must remain green at the end of every commit. No new `// @ts-ignore` without an attached issue ID.
7. **Use incremental changes.** One PR per feature; one logical commit per task. Avoid omnibus PRs.
8. **Avoid unnecessary dependencies.** If you can solve it with the existing stack (Next.js, Tailwind, Radix, Zod, RHF, Framer Motion), do. Justify any new dependency in the PR description.
9. **Match scope to request.** When a task says “add X,” add X — don’t also rewrite Y.
10. **Communicate uncertainty.** If a question hasn’t been answered by the founder, **do not guess**. Mark the task `BLOCKED`, write the question in `Notes`, move on.

---

## 2. Security Rules

1. **Never commit secrets.** Not in `.env`, not in code, not in tests, not in docs.
2. **Never expose credentials in the UI.** This includes seeded admin / referee passwords on `/login` (which already exists in the current code — it gets removed in Phase 0).
3. **Rate-limit sensitive endpoints.** `/api/auth/login`, `/api/auth/forgot-password`, `/api/contestants/[id]`, voting endpoints. Use the shared rate-limit primitive (Upstash Ratelimit or equivalent).
4. **Protect admin / referee routes.** Edge middleware on the page tree; `requireRole(...)` on every privileged API. **Both, not one.**
5. **Validate uploads server-side.** Trust nothing from the client. Use Cloudinary metadata for format / size / duration checks.
6. **Verify payments server-side.** Always re-check `payments.status` from the DB, not from a URL parameter or client-supplied value. The HMAC-verified webhook is authoritative; don’t bypass it.
7. **CSRF defence on cookie-auth POSTs.** Token or `Sec-Fetch-Site` check (Phase 6). Don’t rely solely on `SameSite=Lax`.
8. **Audit-log every admin / referee mutation.** No status change, payment override, or assignment may go through without writing to `audit_logs` (Phase 6+).
9. **Reduce PII in public responses.** Anonymous `/api/contestants/[id]` returns initials + status, not full name + DOB + phone.
10. **Never log secrets or full PII.** No `console.log(req.body)` on auth or payment routes. No `console.log` of the JWT.

---

## 3. UX Rules

1. **Mobile-first.** Every page is designed for a 5-inch portrait viewport before desktop.
2. **Clear user journeys.** Each screen has one primary action. Don’t multiply CTAs.
3. **No misleading feature claims.** If the marketing copy says “SMS notifications,” the SMS service must work. Otherwise the copy doesn’t ship.
4. **Premium music/show branding.** Bling Records Show + Neo Studios attribution. No generic AGT framing. No fictional users / numbers.
5. **Clear loading and error states.** No bare “Loading…” spinners with no escape. Every async surface has skeleton + retry + clear failure copy.
6. **Clear video upload guidance.** The contestant must know format / size / duration / originality rules before they pick a file.
7. **Bilingual EN / አማርኛ on contestant-facing critical flows.** Operator surfaces can be EN-only.
8. **Accessibility.** WCAG AA contrast minimum; `aria-label` on icon-only buttons; `<label htmlFor>` on every form field; `prefers-reduced-motion` respected.
9. **No autoplaying audio.** Reels / clips load muted; tap to unmute.
10. **Status copy is reviewed by founder.** Every public-facing status string must be approved.

---

## 4. Development Rules

1. **One phase at a time.** Don’t start Phase 5 work while Phase 4 is `IN PROGRESS`.
2. **One task group at a time.** A task can have several sub-actions, but don’t silently bundle a second task into the same PR.
3. **Update the task tracker** as state changes — see §1 rule 2.
4. **Run `npm run type-check` before considering work done.** It must be green.
5. **Run `npm run lint` if available.** If it isn’t, that wiring is itself a Phase 0 task.
6. **Add acceptance notes after completing each task.** A short paragraph in the PR description describing how you verified the acceptance criteria (manual test steps, fixture used, screenshot reference).
7. **Do not touch unrelated code.** No drive-by refactors. If you spot something worth fixing, file a task in the tracker.
8. **Do not modify migrations destructively in the same release.** Always additive in one deploy, destructive in a later one. See [data-model-and-api-plan.md](data-model-and-api-plan.md#7-migration-plan-summary).
9. **Schemas are validated with Zod.** Don’t reintroduce raw `JSON.parse` of request bodies; use `parseJson(req, Schema)`.
10. **API responses use the existing envelope.** `{ ok: true, data }` / `{ ok: false, error }`. Don’t invent a second shape.
11. **Server-only modules stay server-only.** `src/lib/db.ts` and `src/lib/auth.ts` must never be imported by a client component. `src/lib/dto-types.ts` mirrors types for client use.
12. **Background work goes through Vercel Cron / a queue (Phase 11+),** not long-running route handlers.
13. **Don’t add a feature flag** unless you’re actually using it. Premature flags rot.

---

## 5. Documentation Rules

1. **Update docs when behaviour changes.** Every PR that changes a route, API, or schema must update the matching doc.
   - New route → [full-ux-ecosystem-documentation.md §5](full-ux-ecosystem-documentation.md#5-full-information-architecture).
   - New API → [data-model-and-api-plan.md §4](data-model-and-api-plan.md#4-api-areas).
   - New schema → [data-model-and-api-plan.md §2](data-model-and-api-plan.md#2-entities).
   - New feature → [product-feature-matrix.md](product-feature-matrix.md).
2. **Keep README accurate.** Quick-start commands must work as written. After Phase 0, the README documents the Postgres / Neon stack, not SQLite.
3. **Keep env docs accurate.** `.env.example` lists every required key; this doc + [technical-architecture-plan.md](technical-architecture-plan.md#3-environment-strategy) explain why.
4. **Document new routes / APIs in the PR description.** Even before the doc is updated, the PR description tells the reviewer what to expect.
5. **Don’t duplicate docs.** Cross-reference instead. If two docs disagree, the one that owns the topic wins; the other gets a one-line correction.
6. **Don’t silently rename docs.** Rename = redirect (a stub file pointing to the new one) for at least one phase.

---

## 6. Out-of-Scope Rules

Agents must **not** implement the following unless a later prompt explicitly allows it:

| Feature | Phase it belongs to |
| --- | --- |
| Livestreaming | 11+ |
| TikTok-style social feed | 8 / 11 |
| Public voting | 9 |
| Mobile apps | 12 |
| Sponsor dashboard | 13 |
| Celebrity / mentor portal | 13 |
| Episode / season management | 10 |
| AI talent judging | 14 |
| Paid voting | 9 |
| Advanced analytics (cohorts, retention) | 14 |
| Reels view with persisted likes | 8 |
| In-app messaging between admin and contestants | 8 / 14 |
| Contract / NDA signing flow | 14 |
| Music rights / licensing module | 14 |
| Public contestant leaderboard | 9 |

If the founder asks for one of the above, **push back** with a reference to this rule and ask which MVP item to swap out.

---

## 7. Completion Report Format

At the end of every agent run, the agent **must** output a completion report in this shape. Even if it’s a 5-minute task. Even if nothing changed.

```
## Completion report

**Files changed:**
- path/to/file.ts (added rate-limit on /api/auth/login)
- path/to/component.tsx (hid seeded creds in production builds)
- docs/task-tracker.md (status updates)

**Tasks completed:**
- P0-T008 — Hide seeded creds on /login → DONE
- P0-T009 — Add rate-limit on /api/auth/login → IN PROGRESS (login done, result-checker pending)

**Tasks blocked:**
- P0-T002 — Rotate Neon credentials → BLOCKED (founder action required)

**Tests / checks run:**
- `npm run type-check` → green
- `npm run lint` → green
- Manual test: login on a production-like build, no seeded-creds block visible
- Manual test: 11 failed logins from a single IP returned 429 on the 11th

**Risks found:**
- The rate-limit primitive uses an in-memory store as a placeholder; need to wire Upstash before production. Filed as P0-T009b.

**Task tracker updates:**
- P0-T008: NOT STARTED → DONE
- P0-T009: NOT STARTED → IN PROGRESS
- New task added: P0-T009b — Wire production rate-limit store

**Recommended next task:**
- P0-T009b — Wire production rate-limit store (Upstash)
```

The report goes into the agent’s final user-facing message and (where applicable) into the PR description.

---

## 8. PR / commit conventions

- **Branch name:** `phase{N}/{task-id}-{short-slug}` — e.g., `phase0/P0-T009-rate-limit`.
- **Commit messages:** prefix with the task ID: `P0-T009: add login rate-limit (10/15min/IP)`.
- **PR title:** same form. PR description includes the §7 completion report.
- **One PR per task** ideally; merge several only when they’re trivially related (e.g., `P1-T011` + `P1-T012` are both vestigial-route deletions).

---

## 9. Escalation paths

- **Found a security issue:** stop work, mark current task `BLOCKED`, ping the founder. Do not commit anything that mitigates it without sign-off.
- **Found a legal issue (terms / privacy / refund):** mark task `BLOCKED`; require legal sign-off before continuing.
- **Found a destructive migration that needs to run:** stop, write the migration plan into a new task, get sign-off, then execute in two deploys (additive then destructive).
- **Found that an acceptance criterion is impossible:** mark task `BLOCKED`, propose a revised acceptance criterion in `Notes`, get sign-off, then continue.

---

## 10. What “done” looks like for a phase

A phase is `DONE` only when **all** of the following hold:

- Every `P0` and `P1` task in the phase is `DONE`.
- `npm run type-check` is green on `main`.
- `npm run lint` is green on `main` (after Phase 0 wires it).
- The phase’s acceptance criteria from [full-development-roadmap.md](full-development-roadmap.md) are demonstrably met.
- The relevant docs in this package have been updated.
- The Phase Tracker row in [task-tracker.md](task-tracker.md) is updated to `DONE`, `100 %`, with a completion date.

---

*End of Agent Execution Rules.*
