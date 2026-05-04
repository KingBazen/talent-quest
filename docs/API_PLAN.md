# API plan (Phase 2)

REST over HTTPS. JSON request/response. Versioned at `/api/v1/`. All endpoints
that mutate state require the appropriate role and a CSRF token.

Standard error envelope:
```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "phone is invalid",
    "fields": { "phone": "must match E.164" }
  }
}
```

Standard success envelope:
```json
{ "data": { ... } }
```

## Auth

| Method | Path                              | Role     | Notes |
| ------ | --------------------------------- | -------- | ----- |
| POST   | `/api/v1/auth/register`           | public   | email + password OR phone OTP flow |
| POST   | `/api/v1/auth/login`              | public   | issues access + refresh JWT |
| POST   | `/api/v1/auth/refresh`            | any      | rotates refresh token |
| POST   | `/api/v1/auth/logout`             | any      | revokes session |
| POST   | `/api/v1/auth/otp/request`        | public   | sends 6-digit SMS OTP |
| POST   | `/api/v1/auth/otp/verify`         | public   | verifies + logs in |
| POST   | `/api/v1/auth/password/forgot`    | public   | sends reset link |
| POST   | `/api/v1/auth/password/reset`     | public   | accepts token |
| POST   | `/api/v1/auth/2fa/enroll`         | admin/judge | TOTP enrollment |

## Contestant

| Method | Path                                        | Role        | Notes |
| ------ | ------------------------------------------- | ----------- | ----- |
| POST   | `/api/v1/contestants`                       | contestant  | creates contestant + assigns 6-digit `public_id` |
| GET    | `/api/v1/contestants/me`                    | contestant  | own profile |
| PATCH  | `/api/v1/contestants/me`                    | contestant  | edit bio, stage name, contact |
| GET    | `/api/v1/contestants/by-public-id/:id`      | public      | minimal public projection (Result Checker) |
| POST   | `/api/v1/contestants/me/avatar`             | contestant  | signed upload |

## Submissions / videos

| Method | Path                                      | Role       | Notes |
| ------ | ----------------------------------------- | ---------- | ----- |
| POST   | `/api/v1/submissions/upload-url`          | contestant | mints signed Cloudinary/Mux/S3 URL + returns `submission_id` |
| POST   | `/api/v1/submissions/:id/finalize`        | contestant | called after upload completes |
| GET    | `/api/v1/submissions/me`                  | contestant | own submission per round |
| POST   | `/api/v1/webhooks/video/:provider`        | provider   | transcoder webhook → marks `ready` |
| POST   | `/api/v1/submissions/:id/flag`            | judge/admin | content flag |
| GET    | `/api/v1/showcase`                        | public     | paginated, filterable approved clips |

## Payments

| Method | Path                              | Role       | Notes |
| ------ | --------------------------------- | ---------- | ----- |
| POST   | `/api/v1/payments/intent`         | contestant | returns Telebirr redirect URL or QR |
| GET    | `/api/v1/payments/me`             | contestant | own payment history |
| POST   | `/api/v1/webhooks/payments/:agg`  | provider   | AdmasPay / Paylib callback |
| POST   | `/api/v1/payments/:id/refund`     | admin      | full or partial |

## Judging

| Method | Path                                        | Role  | Notes |
| ------ | ------------------------------------------- | ----- | ----- |
| GET    | `/api/v1/judge/queue`                       | judge | clips assigned to me, filtered by round |
| POST   | `/api/v1/judge/scores`                      | judge | upsert score for `submission_id` |
| GET    | `/api/v1/judge/scores/:submission_id`       | judge | own draft if any |

## Admin

| Method | Path                                | Role  | Notes |
| ------ | ----------------------------------- | ----- | ----- |
| GET    | `/api/v1/admin/dashboard`           | admin | KPI bundle |
| GET    | `/api/v1/admin/contestants`         | admin | search + paginate |
| POST   | `/api/v1/admin/rounds/:id/open`     | admin | round state machine |
| POST   | `/api/v1/admin/rounds/:id/close`    | admin | |
| POST   | `/api/v1/admin/rounds/:id/publish`  | admin | publishes results + fan-out |
| POST   | `/api/v1/admin/judges/assign`       | admin | bulk-assign submissions to judges |
| POST   | `/api/v1/admin/notifications`       | admin | bulk SMS/email send |
| GET    | `/api/v1/admin/audit-log`           | admin | filtered, paginated |

## Chatbot

| Method | Path                       | Role   | Notes |
| ------ | -------------------------- | ------ | ----- |
| POST   | `/api/v1/chat/message`     | public | streaming SSE; returns assistant reply with citations |
| POST   | `/api/v1/chat/feedback`    | public | thumbs up / down + optional handoff |

## Cross-cutting middleware

- Rate limiter: sliding window, 60 rpm anonymous / 240 rpm authenticated.
- Idempotency-Key support on payment + score POSTs.
- Request logging with correlation id (`x-request-id`).
- CORS pinned to the production domain; preview URLs allow-listed.

## OpenAPI

Generated from Zod / class-validator at build time and published to
`/api/v1/openapi.json`. The frontend imports it via `openapi-typescript` to
keep the API client typed.
