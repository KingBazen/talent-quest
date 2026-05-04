# Technical architecture

## High-level diagram (Phase 2)

```
                    ┌────────────────────────────────────┐
                    │           Browsers / Phones        │
                    │   (Visitor, Contestant, Judge,     │
                    │            Admin)                  │
                    └──────────────┬─────────────────────┘
                                   │ HTTPS
                                   ▼
                  ┌────────────────────────────────────────┐
                  │        Vercel — Next.js front-end      │
                  │   (App Router, RSC, edge middleware)   │
                  └──────────┬───────────────────┬─────────┘
                  static     │ (auth, RBAC,      │ signed
                  CDN        │  CSRF, rate       │ upload tokens
                  cache      │  limit)           │
                             ▼                   ▼
                ┌─────────────────────┐   ┌──────────────────────┐
                │ Node.js API service │   │  Object storage      │
                │  Express or NestJS  │   │  Cloudinary / Mux /  │
                │  (REST + webhooks)  │   │  S3 / Supabase       │
                └─────┬──────┬────────┘   └────────┬─────────────┘
                      │      │                     │ HLS / signed URLs
                      │      │                     ▼
                      │      │            ┌──────────────────┐
                      │      │            │ Video processing │
                      │      │            │ (Mux/Cloudinary  │
                      │      │            │  transcoding)    │
                      │      │            └──────────────────┘
                      │      │
        ┌─────────────▼─┐  ┌─▼───────────────┐  ┌────────────────┐
        │ PostgreSQL    │  │ Redis (cache,   │  │ Telebirr via   │
        │ (Supabase /   │  │ rate-limit,     │  │ AdmasPay /     │
        │  Neon /       │  │ OTP, sessions)  │  │ Paylib         │
        │  managed PG)  │  └─────────────────┘  └───────┬────────┘
        └───────────────┘                               │ webhooks
                                                        ▼
                                              ┌──────────────────┐
                                              │ Payment-callback │
                                              │ verifier (Node)  │
                                              └──────────────────┘
                      ▲
                      │ async jobs
        ┌─────────────┴───────────┐
        │ Worker / queue (BullMQ) │  email, SMS, notifications, scoring aggregation
        └─────────────────────────┘
```

## Components

### Front-end — Next.js 14 on Vercel

- App Router with React Server Components for content-heavy pages (homepage,
  categories, FAQ, showcase listing).
- Client components for interactive surfaces (registration form, showcase
  player, profile, judge console, admin dashboard).
- Edge middleware for auth-cookie verification and locale routing.
- Image optimization via `next/image`; static assets cached at the CDN.
- PWA shell (manifest + service worker) so the site is installable on mobile.

### API service — Express.js or NestJS

- One repo, one deployment unit. NestJS recommended for the modular DI and
  built-in validation; Express is acceptable for a leaner team.
- REST + Webhooks; contracts defined with Zod (Express) or class-validator
  (NestJS) and shared with the frontend via OpenAPI generator.
- Long-running tasks (transcoding, notifications, score aggregation) go on a
  BullMQ queue backed by Redis.

### Database — PostgreSQL (managed)

- Supabase, Neon, or AWS RDS. Single primary + 1 read replica.
- Migrations with Prisma Migrate or Knex.
- Logical backups daily, point-in-time-recovery enabled.

### Redis

- OTP store, refresh-token rotation list, rate limiter (sliding window),
  webhook idempotency keys, BullMQ queues, hot read cache for showcase counts.

### Object storage + video processing

- Choose one primary:
  - **Cloudinary** — fastest path; transformations + adaptive streaming included.
  - **Mux** — highest-quality streaming + per-title encoding stats.
  - **AWS S3 + MediaConvert** — most control, lowest unit cost at scale.
  - **Supabase Storage** — same vendor as DB; OK for early launch.
- Clients upload directly to storage with short-lived signed URLs minted by
  the API. Webhooks notify the API when transcoding completes.

### Payments — Telebirr via AdmasPay / Paylib

- Aggregator handles Telebirr SDK + KYC.
- Server creates a payment intent, returns redirect URL or QR.
- Aggregator posts a callback webhook on success/failure.
- Verifier service validates HMAC signature, looks up by reference, and marks
  payment as confirmed in PostgreSQL inside a transaction.
- Idempotent — the same callback delivered twice has no second effect.

### Auth & RBAC

- Roles: `visitor`, `contestant`, `judge`, `admin`. Stored in `users.role`.
- Access tokens are short-lived JWTs; refresh tokens are opaque, rotating, and
  revocable by stored hash.
- Server middleware enforces route policies (e.g. judge-only endpoints).
- Audit log table records every state-changing action with `(user_id, role,
  action, target, ip, ua)`.

### Notifications

- Async fan-out via BullMQ.
- Email — Resend / SES / Postmark.
- SMS — local Ethiopian aggregator (e.g. AfroMessage, NaijaMobile).
- Templates support Amharic + English.

## Environments

| Environment | Purpose                            | Hosting                |
| ----------- | ---------------------------------- | ---------------------- |
| local       | Developer machine                  | Docker Compose         |
| preview     | Per-PR ephemeral preview           | Vercel preview deploys |
| staging     | Stable QA / UAT                    | Vercel + staging API   |
| production  | Public site                        | Vercel + prod API      |

## CI / CD

- GitHub Actions: lint, type-check, unit tests, integration tests, Lighthouse
  budget check on preview deploys.
- Vercel auto-deploys the front-end on merge to `main`.
- API deploys via Render / Railway / Fly.io / AWS App Runner — pick whichever
  the team is most comfortable operating.

## Repos

- Single monorepo with workspaces (`apps/web`, `apps/api`, `packages/shared`).
- `packages/shared` exports Zod schemas, type definitions, and constants used
  by both frontend and backend.
