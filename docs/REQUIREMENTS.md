# Functional & Non-functional requirements

## Functional requirements

### FR-1 Authentication & accounts (Phase 2)

- Email + password sign-up with bcrypt/argon2 hashing.
- Phone-based OTP login (6-digit, 5-min TTL, max 5 attempts).
- Session = HTTP-only cookie holding a JWT (15-min access) plus refresh token
  rotation.
- Email verification before submission can be unlocked.
- Password reset via signed email link, 30-min TTL.
- Optional 2FA via TOTP for admin and judge roles.

### FR-2 Contestant ID generation

- Globally unique numeric ID, up to 6 digits in Phase 1 (random) and 6+ digits
  in Phase 2 (sequence-backed with collision-safe insert).
- IDs are immutable and embedded in URLs only when public.

### FR-3 Registration

- Multi-step form with client + server validation.
- Required: full name, email, phone, age (≥ 13), city, category, bio.
- Optional: stage name, social links, headshot.
- Storing under-18 flag triggers a guardian-consent step before video upload.

### FR-4 Payments (Phase 2)

- Entry fee in ETB, displayed before checkout.
- Telebirr through AdmasPay or Paylib.
- Webhook-driven verification on the backend; only confirmed payments unlock
  video upload.
- Idempotent retries; reconciliation report exportable as CSV.

### FR-5 Video upload & processing (Phase 2)

- Direct-to-storage upload (Cloudinary / Mux / Supabase Storage / S3) using
  signed upload URLs.
- Chunked + resumable for files up to 500 MB.
- Server-side transcoding to HLS (240p / 480p / 720p / 1080p).
- Auto-thumbnail at frame 30 % and 60 %.
- Optional auto-captioning (Amharic + English) at ingest.
- Antivirus / NSFW screening before judges see the clip.

### FR-6 Judging

- Five-criterion rubric (Talent 25, Originality 25, Stage Presence 20,
  Production 15, Connection 15) summed to /100.
- Each clip is assigned to ≥ 3 judges; the median is the official score.
- Judges can leave private notes (judge-visible) and a one-line public note
  (contestant-visible).

### FR-7 Result publishing

- Per-round publish action: marks clips as advanced / shortlisted / eliminated.
- Triggers SMS + email + in-profile notification.
- Result Checker page resolves a 6-digit ID to the public status.

### FR-8 Showcase

- Public list of approved clips with category filter.
- Reels-style vertical scroll on small screens.
- YouTube-style grid with hero clip on larger screens.
- Like, share, and view counters.

### FR-9 Chatbot (Phase 2)

- LLM-backed (Claude / GPT-class) with retrieval over rules, schedule, and
  contestant FAQ.
- English + Amharic detection with reply in user's language.
- Hand-off to human via support ticket when confidence is low.

### FR-10 Admin

- Dashboard cards for KPIs.
- CRUD for rounds, judges, categories, content moderation.
- Audit log of every state-changing admin action.

## Non-functional requirements

### NFR-1 Performance

- Lighthouse mobile performance ≥ 90 on the homepage.
- TTFB ≤ 400 ms for cached pages on Vercel CDN.
- Showcase clips start playback in ≤ 1.5 s on 3G via HLS adaptive bitrate.

### NFR-2 Availability

- 99.9 % monthly uptime for the public site.
- 99.95 % for payment-callback endpoint.

### NFR-3 Scalability

- Comfortably handle 25,000 active contestants per season and 5 M monthly
  showcase views.
- Horizontal scaling on the API layer; database with read replicas.

### NFR-4 Security

- See [`SECURITY.md`](./SECURITY.md) for the full threat model and mitigations.
- All PII encrypted at rest. TLS 1.3 in transit.

### NFR-5 Privacy & compliance

- Comply with Ethiopian data-protection norms; clear retention policy
  (contestant data deleted on request; aggregate analytics anonymized).
- Never share phone / email with third parties.
- Cookie banner with categorized consent (Phase 2).

### NFR-6 Accessibility

- WCAG 2.1 AA across all public pages.
- Keyboard navigable, screen-reader announced, focus rings visible.

### NFR-7 Internationalization

- English and Amharic across UI, errors, notifications, chatbot, and PDFs.

### NFR-8 Observability

- Centralized logs (request id, user id, route).
- Metrics dashboard (RED/USE).
- Alerts on payment-callback failure rate, video-pipeline backlog, error rate.

### NFR-9 Backups

- Daily encrypted backups of PostgreSQL, retained 30 days.
- Quarterly restore drill.
