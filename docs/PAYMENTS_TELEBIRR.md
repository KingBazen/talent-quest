# Telebirr integration (via AdmasPay or Paylib)

## Why an aggregator

Direct Telebirr integration requires a merchant agreement with Ethio Telecom
plus access to internal SDKs that are not always available to small teams.
Payment aggregators (AdmasPay, Paylib, Chapa) wrap Telebirr — and other
methods — under a unified REST API.

## Flow

```
Contestant ──► Web app ──► API: POST /api/v1/payments/intent
                                    │
                                    ▼
                           Aggregator: create payment
                                    │
                  redirect URL or QR │
                                    ▼
                    Contestant pays in Telebirr app
                                    │
                                    ▼
              Aggregator webhook → POST /api/v1/webhooks/payments/:agg
                                    │
                       Verify HMAC, mark payment
                                    │
                                    ▼
                        Re-fetch status from aggregator
                                    │
                                    ▼
                      Mark contestant unlocked, fan-out
```

## Step-by-step

1. **Create payment intent.** API receives `amount_etb`, `round_id`, and
   `contestant_id` from the authenticated user. It writes a `payments` row
   with `status='pending'` and a server-generated `provider_ref`. Then it
   calls the aggregator's `POST /v1/charges` (exact path varies). The
   response is a redirect URL or a QR string.
2. **Hand off to Telebirr.** The frontend opens the redirect URL in a new
   tab, or shows the QR for scan in the Telebirr app.
3. **Webhook callback.** The aggregator posts a JSON payload to
   `POST /api/v1/webhooks/payments/:agg` after the Telebirr transaction
   resolves. The endpoint verifies the HMAC signature using the shared
   secret, then re-fetches the status from `GET /v1/charges/:id` to defend
   against a forged webhook.
4. **Idempotent finalize.** If `payments.provider_ref` is already in
   terminal state (`succeeded`, `failed`, `refunded`), the handler returns
   200 immediately. Otherwise it transitions the row inside a transaction
   and enqueues notification jobs.
5. **Audit + reconcile.** Every callback writes the full payload into
   `payments.webhook_payload` for forensic use. A nightly reconciliation
   compares aggregator records to our DB and alerts on drift.

## Required environment variables

```
TELEBIRR_AGG_PROVIDER=admaspay         # or paylib
TELEBIRR_AGG_API_BASE=https://api.admaspay.com/v1
TELEBIRR_AGG_API_KEY=...
TELEBIRR_AGG_WEBHOOK_SECRET=...        # HMAC secret
TELEBIRR_AGG_RETURN_URL=https://talentquest.example.com/payments/return
```

## Test cards / numbers

Aggregators provide a sandbox mode with fixed phone numbers that always
succeed/fail. We map our staging environment to the sandbox; production keys
live only in the production secret manager.

## Edge cases

- **Webhook before redirect-return.** Common. The user sees the Telebirr app
  succeed, but the redirect to our `RETURN_URL` arrives a moment later. Our
  return page polls `GET /api/v1/payments/me?provider_ref=...` for ≤ 30 s.
- **Webhook delivered twice.** Idempotency on `provider_ref` makes this safe.
- **Webhook never delivered.** A 5-minute fallback poller picks up `pending`
  payments older than 10 minutes and re-fetches status from the aggregator.
- **Partial refund.** Allowed by API; logged with the original `payments` row
  via a `refunds` child row.

## Compliance & receipts

- Each successful payment generates a PDF receipt (Amharic + English) emailed
  to the contestant and stored under their account.
- Receipts include the merchant TIN, transaction reference, and timestamp.
