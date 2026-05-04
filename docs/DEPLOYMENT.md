# Deployment plan

## Phase 1 (this MVP)

1. Push the repo to GitHub.
2. Sign in to Vercel with GitHub, then **Add New → Project → Import Repo**.
3. Vercel auto-detects Next.js. Build command `next build`, output dir
   `.next`. No environment variables needed.
4. Click **Deploy**. The first build takes ~90 s.
5. After deploy, set custom domain in **Project → Settings → Domains** (e.g.
   `talentquest.et`). Vercel issues TLS automatically.
6. Optional: enable Web Analytics + Speed Insights (one click).

That's the entire Phase 1 deployment story — no databases, no secrets, no
queue. Stakeholders are ready to demo within 5 minutes.

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
