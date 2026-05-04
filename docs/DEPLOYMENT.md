# Deployment plan

## Production deployment (current codebase)

The app is a single Next.js 14 deployment with API routes under `/api`. It
needs:

1. Node 20.6+ runtime
2. A writable directory for the SQLite file (or a Postgres URL — see below)
3. The following env vars (see `.env.example` for the full list)

### Required env vars

| Var                        | Purpose                                      |
| -------------------------- | -------------------------------------------- |
| `JWT_SECRET`               | 32+ random chars; signs session cookies      |
| `NEXT_PUBLIC_SITE_URL`     | Absolute origin (used in sitemap, payments)  |

### Optional env vars (graceful stub mode without them)

| Group              | Vars                                                          | Without |
| ------------------ | ------------------------------------------------------------- | ------- |
| Telebirr/AdmasPay  | `TELEBIRR_MERCHANT_ID`, `TELEBIRR_APP_KEY`, `TELEBIRR_HMAC_SECRET`, `TELEBIRR_NOTIFY_URL`, `TELEBIRR_API_URL` | Returns mock redirect URLs; webhooks rejected |
| Cloudinary uploads | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_UPLOAD_PRESET` | Falls back to local `/public/uploads` |
| LLM chatbot        | `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`                        | Static FAQ matcher only |

### Deploy targets

#### Render / Fly.io / Railway / VPS (SQLite — easiest)

1. Provision the service, attach a persistent volume mounted at `/app/data`.
2. Set `DATABASE_PATH=/app/data/talentquest.db` and the env vars above.
3. Build command: `npm install && npm run build`.
4. Start command: `npm run db:init && npm run start`.
5. (One-shot) Run `npm run db:seed` after first deploy or via a manual job.

#### Vercel (Postgres — required)

Vercel's serverless filesystem is read-only and short-lived, so SQLite
won't persist. Switch to Postgres:

1. Create a Vercel Postgres / Neon / Supabase database.
2. Replace `better-sqlite3` with `pg` (or `@vercel/postgres`) in
   `src/lib/db.ts`. The schema in `migrate()` is plain SQL — only minor
   tweaks (e.g. `INTEGER` → `BIGINT`, `?` → `$1`) are needed.
3. Set `DATABASE_URL` and the secrets above in **Project → Settings →
   Environment Variables**.
4. Push to a GitHub branch connected to Vercel; auto-deploy.
5. Run migrations once via `vercel env pull && DATABASE_URL=… npm run db:init`.

### Smoke checks after deploy

```bash
curl https://<your-host>/api/auth/me              # → {ok:true, data:{user:null,...}}
curl -X POST https://<your-host>/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"admin@…","password":"…"}'         # → {ok:true,data:{user:{...}}}
```

The `/admin` and `/referee` routes 307 to `/login?next=…` for unauthenticated
visitors — that's the middleware enforcing RBAC at the edge.

---

## Phase 2 (production system)

### Topology

| Surface          | Hosting recommendation                       |
| ---------------- | -------------------------------------------- |
| Web app          | Vercel                                       |
| API service      | Render / Railway / Fly.io / AWS App Runner   |
| PostgreSQL       | Supabase / Neon / RDS (managed)              |
| Redis            | Upstash / Render Redis / ElastiCache         |
| Object storage   | Cloudinary / Mux / S3 / Supabase Storage     |
| Async workers    | Same host as API (separate process)          |
| Email            | Resend / SES / Postmark                      |
| SMS              | Local Ethiopian aggregator (e.g. AfroMessage) |
| Observability    | Logtail / Datadog / Grafana Cloud            |
| Error tracking   | Sentry                                       |

### Environment variables (production)

```
# Web (Vercel)
NEXT_PUBLIC_API_BASE=https://api.talentquest.et
NEXT_PUBLIC_SHOWCASE_PROVIDER=mux

# API
DATABASE_URL=postgres://...
REDIS_URL=rediss://...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
COOKIE_DOMAIN=.talentquest.et

# Telebirr aggregator
TELEBIRR_AGG_PROVIDER=admaspay
TELEBIRR_AGG_API_KEY=...
TELEBIRR_AGG_WEBHOOK_SECRET=...

# Video provider
MUX_TOKEN_ID=...
MUX_TOKEN_SECRET=...
MUX_WEBHOOK_SECRET=...

# Notifications
RESEND_API_KEY=...
SMS_PROVIDER_API_KEY=...

# Observability
SENTRY_DSN=...
LOGTAIL_TOKEN=...
```

Production secrets live in the host's secret manager (Vercel Encrypted Env,
Render Secret, AWS SSM). Never in the repo.

### CI / CD pipeline

```
PR opened
  ├── lint + type-check + unit tests           (GitHub Actions)
  ├── e2e (Playwright) on Vercel preview       (GitHub Actions)
  └── Lighthouse budget check on preview       (GitHub Actions)

Merge to main
  ├── Vercel auto-deploys web                  (Vercel)
  ├── GitHub Actions builds + deploys API      (Render/Fly/Railway)
  └── DB migrations run via npm script gated   (manual approval)
```

### Migration strategy

- Migrations live in the API repo (`apps/api/migrations`).
- Forward-only; rollbacks via compensating migrations.
- Schema changes deploy in two phases for column renames or removals
  (expand → backfill → contract).
- Production migrations require manual approval in the GitHub Action.

### DNS

- Apex `talentquest.et` → Vercel (web).
- `api.talentquest.et` → API host.
- `cdn.talentquest.et` → CDN in front of object storage (optional).

### Backups & disaster recovery

- DB snapshot daily, PITR enabled, RPO ≤ 1 hour.
- Quarterly restore drills.
- Object storage versioning enabled for the avatar / showcase buckets.

### Monitoring & alerting

- Sentry: front-end + API errors with release tagging.
- Uptime: Pingdom / BetterUptime monitors on `/healthz` (web + API) and the
  payment-callback endpoint.
- Metrics: request rate, error rate, p95 latency, queue depth, transcoding
  backlog. Alert when:
  - 5-min error rate > 2 %.
  - Payment callback success rate < 95 % (5-min).
  - Queue depth > 500 jobs.
  - Transcoding backlog > 30 min.

### Launch checklist

- [ ] DNS + TLS verified on all subdomains.
- [ ] Telebirr aggregator credentials in production secret manager.
- [ ] SMS aggregator load test at 10× expected peak.
- [ ] Penetration test signed off.
- [ ] WCAG audit signed off.
- [ ] Backup restore drill executed within 14 days of launch.
- [ ] Incident runbooks committed to the repo and linked from the on-call rota.
