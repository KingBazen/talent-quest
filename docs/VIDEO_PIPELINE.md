# Video upload & processing pipeline

## Provider choice matrix

| Provider                | Strengths                                                | Trade-offs                       |
| ----------------------- | -------------------------------------------------------- | -------------------------------- |
| Cloudinary              | One-call upload + transformations, generous free tier    | Premium pricing at scale         |
| Mux                     | Best-in-class adaptive HLS, per-title encoding stats     | No baked-in transformations      |
| Supabase Storage        | Same vendor as DB; quick auth integration                | Requires custom transcoding      |
| AWS S3 + MediaConvert   | Lowest unit cost at scale, deepest controls              | Most ops work to build & maintain |

We default to **Mux** for production (best playback in low-bandwidth networks),
with **Cloudinary** as a fallback for quick wins. The pipeline contract is
provider-neutral.

## Upload flow

1. **Mint upload URL.** Client calls `POST /api/v1/submissions/upload-url`
   with `round_id`. Server checks: contestant is active, round is open,
   payment is `succeeded`, no existing submission for this round.
2. **Direct upload.** Client uploads in chunks (5 MB) to the provider with
   the signed URL. Browser shows a progress bar and supports
   pause/resume on the same `submission_id`.
3. **Finalize.** Client calls `POST /api/v1/submissions/:id/finalize`. Server
   marks status `processing` and stores the asset id.
4. **Provider webhook.** When transcoding finishes, the provider posts to
   `POST /api/v1/webhooks/video/:provider`. The handler verifies HMAC,
   updates status to `ready`, captures the HLS playback URL and thumbnail,
   and enqueues moderation + judge-assignment jobs.
5. **Moderation gate.** A moderation worker checks duration (≤ 180 s),
   audio presence, NSFW, and copyright signal (via the provider's
   detection or a 3rd-party). Pass → `approved`. Fail → `flagged`,
   admin reviews.
6. **Judge assignment.** A scheduler distributes approved submissions to
   judges in the round, balancing load and category expertise. Each clip
   goes to ≥ 3 judges.

## Constraints

- File size: 500 MB max.
- Duration: 60–180 s.
- Containers: MP4 (H.264 + AAC) preferred; MOV / WEBM accepted.
- Resolutions: 720p–4K input. Output transcoded to 240/480/720/1080p HLS.

## Playback & access control

- Public showcase clips: HLS playlist served with long-cache TTL on the CDN.
- Unpublished clips (in review, judges only): playlist signed with a 5-minute
  TTL token; the video player refreshes the token automatically.
- Optional watermark on grand-final reveal clips.

## Error handling

- Network drop mid-upload → resume from last completed chunk for ≤ 24 h.
- Webhook never arrives → the API has a periodic reconciler that polls
  provider status for `processing` rows older than 15 min.
- Transcoding failure → status `rejected`, contestant notified via in-app +
  SMS with the reason and a link to re-upload.

## Captions & accessibility

- Auto-caption job (provider feature or 3rd-party) on ingest. Captions stored
  as a sidecar VTT file. Contestants can edit captions from their profile.

## Metrics

- Upload completion rate.
- p50 / p95 transcoding duration by resolution.
- Bytes ingested vs delivered (cost view).
- Per-clip startup time, rebuffering ratio.
