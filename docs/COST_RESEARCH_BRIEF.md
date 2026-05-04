# Production cost research brief — TalentQuest

This document is an **instruction for someone (human or agent) to research and
estimate** the monthly cost of running TalentQuest in production at the target
scale below. It is *not itself* an estimate — the deliverable is a costed plan
produced by following these instructions and verifying every price against the
provider's current published pricing page.

## 1. Goal

Produce a costed deployment plan for TalentQuest sized to:

- **10,000 registered users** (contestants + a small number of referees / admins)
- **~1 GB of media per user** → **~10 TB total stored media**
- A single competition cycle running over ~3 months, with public showcase
  traffic continuing afterwards

Output a recommended stack, a low / mid / high cost scenario, and a per-line-item
table with the assumptions that drove each number. All prices must be cited to
the provider's pricing page on the date of research.

## 2. What the system actually is (read this before pricing anything)

Source of truth: this repository at the current `HEAD`. Key facts that drive cost:

- **Single Next.js 14 app** ([package.json](../package.json)) — App Router, ~16 API
  routes under [src/app/api/](../src/app/api/). One deployable unit; no separate
  backend service.
- **SQLite today** via `better-sqlite3` ([src/lib/db.ts](../src/lib/db.ts)). Will
  not survive 10K users on a serverless host. Assume **migration to managed
  Postgres** is in scope of the cost plan.
- **Video upload is signed direct-to-Cloudinary**
  ([src/lib/uploads.ts](../src/lib/uploads.ts)): bytes never traverse the app
  server. Storage / bandwidth / transcoding cost lives at the video provider,
  not at the app host.
- **Payments are Telebirr / AdmasPay** ([src/lib/payments.ts](../src/lib/payments.ts))
  with three modes (full API, hosted checkout, stub). Cost = per-transaction fee
  set by the aggregator, not infrastructure.
- **Auth is local** (bcrypt + JWT via `jose`, [src/lib/auth.ts](../src/lib/auth.ts)).
  No third-party auth bill.
- **Chatbot is optional** ([src/app/api/chatbot/route.ts](../src/app/api/chatbot/route.ts)) —
  static matcher by default, falls through to Anthropic only when
  `ANTHROPIC_API_KEY` is set. Cost is per-query and only if enabled.
- **No background workers, no Redis, no queue today.** If transcoding webhooks
  or async notification become required, add their cost separately.

## 3. Workload assumptions (fix these before you start)

The 10K / 1 GB inputs are not enough to price video bandwidth. Pin these down
first, in writing, and put them at the top of the deliverable:

| Variable | Suggested baseline | Why it matters |
|---|---|---|
| Users (registered) | 10,000 | DB rows, auth traffic |
| Media per user | 1 GB avg | Storage volume |
| **Total stored media** | **~10 TB** | Dominant cost line |
| Submissions per user | 1–3 | Upload events, transcoding minutes |
| Video length avg | 2–4 min | Transcoding + delivery cost |
| Public showcase viewers | ? × contestants | **Egress = #1 swing factor — must be specified** |
| Avg views per video (lifetime) | 50 / 500 / 5,000 | Drives bandwidth low/mid/high |
| Concurrent peak (registration deadline) | 500 / 2,000 / 5,000 RPS spikes | App tier sizing |
| Referee pool | 20–50 | Mostly negligible cost-wise |
| Chatbot enabled? | yes / no | Anthropic spend only if yes |
| Email volume | ~3 per user (welcome, payment, result) → ~30K/mo at peak | Email provider tier |
| SMS volume | ~1 per user (OTP / result) → ~10K | SMS aggregator tier |
| Region | Ethiopia-primary, global secondary | CDN PoP coverage matters |
| Retention | media kept 12 months post-event | Storage-month total |

If any of these are unknown, present **three scenarios** (low / mid / high) and
make the difference explicit per line item.

## 4. Cost line items to research

For each item below: **(a) which providers to compare**, **(b) the unit you're
pricing**, **(c) the formula to apply at the assumed workload**. Cite the
pricing page URL and the date you read it.

### 4.1 Video storage + delivery (the dominant cost — research first)

10 TB stored, plus egress for views. Compare at minimum:

- **Cloudinary** — already wired in. Price per GB stored, per GB delivered, per
  transformation. Note: most expensive at TB scale, but zero migration work.
- **Mux** — purpose-built for video. Per-minute encoded + per-minute delivered.
  Generally cheaper than Cloudinary at scale; we already mention it in
  [docs/DEPLOYMENT.md](DEPLOYMENT.md).
- **Bunny Stream / Bunny Storage** — typically the cheapest credible option for
  video at 10 TB.
- **Cloudflare R2 + Stream** — R2 has zero egress fees (big deal at 10 TB);
  Stream charges per delivered minute.
- **AWS S3 + CloudFront + MediaConvert** — flexible, complex, requires the most
  glue code; price only if the team is already AWS-fluent.

For each: compute (storage-GB-months × 10,000) + (egress-GB × estimated views ×
file size) + (transcoding minutes × submission count). Surface the egress line
separately — it's the variable that swings the total most.

### 4.2 Application hosting

The app itself is light (Next.js SSR + API routes, no heavy compute). At 10K
users with normal traffic this is **not** the cost driver. Compare:

- **Vercel Pro** — easiest deploy, but requires migrating off SQLite. Price
  function execution + bandwidth. Check current per-seat fee.
- **Railway / Render / Fly.io** — VM-style, persistent disk, lets SQLite keep
  working short-term. Price by container-month.
- **AWS App Runner / ECS Fargate** — only worth pricing if the org is AWS-native.

Sanity check by sizing for the registration-deadline spike, not the average.

### 4.3 Database (managed Postgres)

Required to leave SQLite. At 10K users the row count is small (well under 1 GB
of relational data); the constraint is concurrent connections during spikes,
not size. Compare:

- **Neon** — serverless Postgres, scales to zero, branchable. Strong default.
- **Supabase** — Postgres + ancillary services, fixed-tier pricing.
- **Railway Postgres / Render Postgres** — fixed instance, simplest mental model.
- **AWS RDS** — only if AWS-native.

Price the smallest tier that can sustain the peak concurrent connection count
from §3, plus daily backups + point-in-time recovery.

### 4.4 Email

~30K transactional emails/month at peak (welcome, payment receipts, results).
Compare **Resend**, **Postmark**, **AWS SES**. Check the free-tier ceiling and
the next paid tier — at 30K/mo most providers fall within their lowest paid
plan.

### 4.5 SMS (Ethiopia)

If OTP or result notifications go via SMS, use a **local Ethiopian aggregator**
(e.g. AfroMessage). International providers like Twilio rarely have good
Ethiopia delivery. Get a per-message quote in ETB and convert.

### 4.6 Chatbot (optional)

Only if `ANTHROPIC_API_KEY` is set in production. Pricing input: estimated
queries/user/month × tokens-per-query (system prompt is short — see
[chatbot/route.ts:51-54](../src/app/api/chatbot/route.ts#L51-L54), `max_tokens: 400`).
Use the **Claude Haiku 4.5** rate from Anthropic's pricing page. Default to
static matcher (cost = 0) in the low scenario.

### 4.7 Observability

- **Sentry** — front-end + API errors. Free tier usually covers a project this
  size; price the next tier in case error volume exceeds the cap.
- **Logs** — Logtail / Axiom / host-native. Often free at this scale.
- **Uptime** — BetterUptime / UptimeRobot free tier is fine for the surfaces
  listed in [DEPLOYMENT.md:107-108](DEPLOYMENT.md#L107-L108).

### 4.8 Domain + DNS + TLS

- `.et` domain — buy from Ethio Telecom; one-off + annual renewal in ETB.
- `.com` — Cloudflare Registrar at cost, ~$10/yr.
- DNS + TLS: **Cloudflare free plan** is sufficient (also gives basic DDoS).
- TLS for the app host is auto-issued; no separate cost.

### 4.9 Payments (revenue-side, list for completeness)

Telebirr / AdmasPay charge a per-transaction fee. Not an infrastructure cost,
but the deliverable should call it out so finance sees the unit economics:
registration fee (currently 50 ETB, see
[payments.ts:17](../src/lib/payments.ts#L17)) minus aggregator fee = net per
contestant.

### 4.10 Backups & DR

- DB: PITR is usually included in managed Postgres; verify retention window.
- Video: Cloudinary / Mux / Bunny retain originals by default. If using R2/S3,
  enable versioning and price the extra storage.

### 4.11 One-off / setup costs

Don't bury these — list separately:

- Postgres migration engineering time (rewriting [src/lib/db.ts](../src/lib/db.ts)
  to use `pg` or Drizzle, plus schema port).
- Penetration test + WCAG audit (already in
  [DEPLOYMENT.md:118-124](DEPLOYMENT.md#L118-L124) launch checklist).
- Domain registration year 1.

## 5. Required deliverable

A single document with:

1. **Assumptions table** — every variable from §3 with the value used.
2. **Three scenarios — low / mid / high** — driven by the public-viewer
   multiplier, since that's what swings the total.
3. **Per-line-item table** for each scenario:

   | Item | Provider chosen | Unit price | Quantity | Monthly cost | Source URL + date |

4. **Recommended stack** — one paragraph naming the chosen provider for each
   line and why (cheapest credible / least migration / best Ethiopia coverage).
5. **Sensitivity callouts** — which two or three assumptions, if wrong by 2×,
   change the total by more than 20%. Almost certainly: video egress,
   public-viewer multiplier, transcoding minutes.
6. **Year-1 total** — monthly × 12, plus the one-off setup costs from §4.11.

Format: a table the user can paste into a finance doc. No prose padding.

## 6. Rules for the researcher

- **No fabricated prices.** If a pricing page is paywalled or requires sales
  contact (typical for AWS enterprise tiers and some SMS aggregators), say so
  explicitly and mark the line "quote required" rather than guessing.
- **Cite every number.** Provider name + page URL + date checked. Pricing pages
  change; an undated number is worthless in three months.
- **Pick the realistic SKU.** Free tiers exist but most have caps that 10K users
  will breach in week one. Price the first paid tier the workload actually
  lands in, not the marketing headline.
- **Convert to a single currency** (USD) for the summary, but keep ETB for
  Ethiopia-local line items (domain, SMS, payment fees) so the local cost is
  visible.
- **Flag anything that requires a code change** before it can be deployed (the
  Postgres migration is the obvious one — call it out in the recommended-stack
  paragraph).
