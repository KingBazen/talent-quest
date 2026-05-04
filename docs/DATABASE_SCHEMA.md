# Database schema (Phase 2)

PostgreSQL 15+. Snake_case, plural table names, `id BIGSERIAL` primary keys
unless otherwise noted, `created_at` and `updated_at TIMESTAMPTZ` on every
mutable table.

## ERD overview

```
users 1───* contestants 1───* submissions *───* scores *───1 judges
                │                                  │
                └─< payments                       └─< notes
                │
                └─< notifications

categories 1──* contestants
rounds 1──* submissions
events 1──* schedule_items

audit_logs

content_flags
```

## Tables

### `users`

Every authenticated principal — contestant, judge, admin, support. Visitors do
not have a row.

| column          | type           | notes |
| --------------- | -------------- | ----- |
| id              | BIGSERIAL PK   | |
| email           | citext UNIQUE  | nullable for phone-only signup |
| email_verified  | boolean DEFAULT false | |
| phone           | text UNIQUE    | E.164, nullable for email-only |
| phone_verified  | boolean DEFAULT false | |
| password_hash   | text           | argon2id |
| role            | enum('visitor','contestant','judge','admin') | |
| locale          | enum('en','am') DEFAULT 'en' | |
| totp_secret     | text           | nullable, encrypted at rest (admin/judge) |
| last_login_at   | timestamptz    | |
| created_at, updated_at | timestamptz | |

### `contestants`

| column          | type            | notes |
| --------------- | --------------- | ----- |
| id              | BIGSERIAL PK    | |
| user_id         | BIGINT FK users | unique |
| public_id       | text UNIQUE     | 6+ digit numeric, used in URLs |
| full_name       | text NOT NULL   | |
| stage_name      | text            | |
| age             | int CHECK (age >= 13) | |
| city            | text            | |
| category_id     | BIGINT FK categories | |
| bio             | text            | ≤ 500 chars |
| experience_level| enum('beginner','intermediate','advanced','pro') | |
| guardian_name   | text            | required if age < 18 |
| guardian_phone  | text            | required if age < 18 |
| status          | enum('registered','submitted','review','shortlisted','advanced','eliminated') | |
| created_at, updated_at | timestamptz | |

### `categories`

| column     | type                     | notes |
| ---------- | ------------------------ | ----- |
| id         | BIGSERIAL PK             | |
| slug       | text UNIQUE              | `singing`, `dancing`, ... |
| name       | text                     | |
| name_am    | text                     | Amharic |
| description| text                     | |
| color      | text                     | tailwind gradient identifier |
| active     | boolean DEFAULT true     | |

### `rounds`

| column        | type                 | notes |
| ------------- | -------------------- | ----- |
| id            | BIGSERIAL PK         | |
| season_id     | BIGINT FK seasons    | |
| name          | text                 | `Online qualifier`, `City qualifier`, `Semi-final`, `Final` |
| number        | int                  | sort order |
| opens_at      | timestamptz          | |
| closes_at     | timestamptz          | |
| publishes_at  | timestamptz          | result publish target |
| state         | enum('draft','open','closed','published') | |

### `submissions`

| column         | type                | notes |
| -------------- | ------------------- | ----- |
| id             | BIGSERIAL PK        | |
| contestant_id  | BIGINT FK contestants | |
| round_id       | BIGINT FK rounds    | |
| video_asset_id | text                | provider asset id (Mux/Cloudinary/S3 key) |
| hls_url        | text                | published HLS playlist |
| thumbnail_url  | text                | |
| duration_sec   | int                 | |
| size_bytes     | bigint              | |
| status         | enum('uploaded','processing','ready','flagged','rejected','approved') | |
| flagged_reason | text                | |
| created_at, updated_at | timestamptz | |
| UNIQUE (contestant_id, round_id) | | one submission per round |

### `scores`

| column         | type             | notes |
| -------------- | ---------------- | ----- |
| id             | BIGSERIAL PK     | |
| submission_id  | BIGINT FK submissions | |
| judge_id       | BIGINT FK users (role=judge) | |
| talent         | int CHECK 0-25   | |
| originality    | int CHECK 0-25   | |
| stage_presence | int CHECK 0-20   | |
| production     | int CHECK 0-15   | |
| connection     | int CHECK 0-15   | |
| total          | int GENERATED ALWAYS AS (talent + originality + stage_presence + production + connection) STORED | |
| public_note    | text             | shown to contestant |
| private_note   | text             | judges only |
| submitted_at   | timestamptz      | |
| UNIQUE (submission_id, judge_id) | | one score per judge per clip |

### `payments`

| column         | type            | notes |
| -------------- | --------------- | ----- |
| id             | BIGSERIAL PK    | |
| user_id        | BIGINT FK users | |
| contestant_id  | BIGINT FK contestants | |
| round_id       | BIGINT FK rounds | nullable for one-time fees |
| amount_etb     | numeric(10,2)   | |
| provider       | enum('telebirr_admaspay','telebirr_paylib') | |
| provider_ref   | text UNIQUE     | aggregator transaction id |
| status         | enum('pending','succeeded','failed','refunded') | |
| webhook_payload| jsonb           | full payload for audit |
| created_at, updated_at | timestamptz | |

### `notifications`

| column      | type                | notes |
| ----------- | ------------------- | ----- |
| id          | BIGSERIAL PK        | |
| user_id     | BIGINT FK users     | |
| channel     | enum('email','sms','inapp') | |
| template    | text                | `registration_success`, `result_published`, ... |
| payload     | jsonb               | template variables |
| status      | enum('queued','sent','failed') | |
| sent_at     | timestamptz         | |

### `audit_logs`

| column      | type            | notes |
| ----------- | --------------- | ----- |
| id          | BIGSERIAL PK    | |
| user_id     | BIGINT FK users | nullable for system actions |
| role        | text            | |
| action      | text            | `score.create`, `submission.flag`, `payment.refund`, ... |
| target_kind | text            | `submission`, `user`, ... |
| target_id   | text            | |
| meta        | jsonb           | |
| ip          | inet            | |
| user_agent  | text            | |
| created_at  | timestamptz     | |

### `content_flags`

| column         | type             | notes |
| -------------- | ---------------- | ----- |
| id             | BIGSERIAL PK     | |
| submission_id  | BIGINT FK submissions | |
| flagged_by     | BIGINT FK users  | |
| reason         | enum('audio','copyright','nsfw','off_topic','other') | |
| description    | text             | |
| status         | enum('open','dismissed','resolved') | |

### `seasons`, `events`, `schedule_items`

Lightweight tables for the seasonal calendar and the live-event venue
schedule. Detail in the migration repo.

## Indexes

- `users(email)`, `users(phone)` (unique).
- `contestants(public_id)` (unique).
- `submissions(round_id, status)`.
- `scores(submission_id)` and partial `scores(judge_id, submitted_at)`.
- `payments(provider_ref)` (unique).
- BRIN on `audit_logs(created_at)` for cheap time-range queries.

## Notable constraints / triggers

- A trigger ensures `submissions.status` cannot regress (e.g. `approved` →
  `processing`).
- `scores` insert is allowed only when `submissions.status = 'ready'` and the
  judge is in the round's assignment pool.
- `payments.status` transition from `succeeded` to `refunded` writes an entry
  into `audit_logs` automatically.
