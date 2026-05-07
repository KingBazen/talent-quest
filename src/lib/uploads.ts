import crypto from "node:crypto";

/**
 * Upload provider abstraction.
 *
 * Generates a signed direct-upload payload the browser POSTs to Cloudinary's
 * `/video/upload` endpoint — bytes never touch this server. Requires the
 * `CLOUDINARY_*` env vars to be set.
 *
 * If Cloudinary is not configured the function throws — there is no longer a
 * local-filesystem fallback (it never worked on Vercel anyway, and the
 * fallback's referenced route was missing). The right behaviour for a
 * mis-configured environment is to fail loudly so it's caught in dev.
 */

export interface UploadIntent {
  provider: "cloudinary";
  uploadUrl: string;
  formFields: Record<string, string>;
  publicId: string;
  expiresAt: number;
}

export function uploadsAreLive(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

export class UploadsNotConfiguredError extends Error {
  constructor() {
    super(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your environment."
    );
  }
}

export function createUploadIntent(opts: {
  contestantId: string;
}): UploadIntent {
  if (!uploadsAreLive()) {
    throw new UploadsNotConfiguredError();
  }

  const publicId = `brs/${opts.contestantId}/${crypto
    .randomBytes(6)
    .toString("hex")}`;
  const expiresAt = Math.floor(Date.now() / 1000) + 600;

  const cloud = process.env.CLOUDINARY_CLOUD_NAME!;
  const apiKey = process.env.CLOUDINARY_API_KEY!;
  const secret = process.env.CLOUDINARY_API_SECRET!;
  const preset = process.env.CLOUDINARY_UPLOAD_PRESET || "blingrecordsshow_signed";

  // Cloudinary signature is sha1(sortedParams + apiSecret).
  const params: Record<string, string> = {
    public_id: publicId,
    timestamp: String(expiresAt - 600),
    upload_preset: preset,
  };
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  const signature = crypto
    .createHash("sha1")
    .update(toSign + secret)
    .digest("hex");
  return {
    provider: "cloudinary",
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloud}/video/upload`,
    formFields: { ...params, api_key: apiKey, signature },
    publicId,
    expiresAt: expiresAt * 1000,
  };
}

// ─── P3-T004: server-side verification of an upload result ───────────────────
//
// After a successful direct-upload, the browser POSTs to /api/uploads/finalize
// with the Cloudinary response payload. We do NOT trust client-supplied
// metadata: we re-fetch the resource from Cloudinary's Admin API using
// Basic-auth (api_key + api_secret) and use those authoritative values.

export interface CloudinaryResource {
  public_id: string;
  resource_type: "video" | "image" | "raw";
  format: string;
  bytes: number;
  width: number;
  height: number;
  duration: number;
  secure_url: string;
  url: string;
  version: number;
  created_at: string;
}

/**
 * Fetch a video resource from Cloudinary's Admin API. Throws if Cloudinary
 * is not configured, the resource is missing, or the fetch fails.
 */
export async function fetchCloudinaryVideo(
  publicId: string
): Promise<CloudinaryResource> {
  if (!uploadsAreLive()) throw new UploadsNotConfiguredError();

  const cloud = process.env.CLOUDINARY_CLOUD_NAME!;
  const apiKey = process.env.CLOUDINARY_API_KEY!;
  const secret = process.env.CLOUDINARY_API_SECRET!;

  const auth = Buffer.from(`${apiKey}:${secret}`).toString("base64");
  // The Admin API expects the public_id URL-encoded; nested folders use `/`.
  const url = `https://api.cloudinary.com/v1_1/${cloud}/resources/video/upload/${encodeURIComponent(publicId)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { authorization: `Basic ${auth}` },
    cache: "no-store",
  });
  if (res.status === 404) {
    throw new Error(`Cloudinary: video ${publicId} not found`);
  }
  if (!res.ok) {
    throw new Error(`Cloudinary: HTTP ${res.status}`);
  }
  return (await res.json()) as CloudinaryResource;
}

/**
 * Validation gate for an audition video. Returns either `{ ok: true }` or a
 * `{ ok: false, reason }` with a user-facing failure message.
 */
export interface VideoConstraints {
  minSec: number;
  maxSec: number;
  maxBytes: number;
  minHeight: number;
  acceptedFormats: string[];
}

export const AUDITION_CONSTRAINTS: VideoConstraints = {
  minSec: 60,
  maxSec: 180,
  maxBytes: 500 * 1024 * 1024, // 500 MB
  minHeight: 480,
  acceptedFormats: ["mp4", "mov", "webm", "m4v", "quicktime"],
};

// ─── Server-side image upload (used for bank-transfer receipts) ─────────────
//
// Receipts are small screenshots (<5 MB). Rather than issuing a separate signed
// direct-upload intent for the browser, the server proxies the upload to
// Cloudinary using its `/image/upload` endpoint with a signed multipart form.
// This keeps the receipt flow a single round-trip from the modal.

export interface ReceiptUploadResult {
  secureUrl: string;
  publicId: string;
  bytes: number;
  format: string;
}

const RECEIPT_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const RECEIPT_ACCEPTED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);

export class ReceiptValidationError extends Error {}

export async function uploadReceiptImage(opts: {
  contestantId: string;
  paymentId: string;
  file: File;
}): Promise<ReceiptUploadResult> {
  if (!uploadsAreLive()) throw new UploadsNotConfiguredError();

  if (!RECEIPT_ACCEPTED_MIME.has(opts.file.type)) {
    throw new ReceiptValidationError(
      "Receipt must be a PNG, JPG, or WebP screenshot."
    );
  }
  if (opts.file.size > RECEIPT_MAX_BYTES) {
    throw new ReceiptValidationError(
      `Receipt is too large — ${(opts.file.size / (1024 * 1024)).toFixed(1)} MB, max 5 MB.`
    );
  }

  const cloud = process.env.CLOUDINARY_CLOUD_NAME!;
  const apiKey = process.env.CLOUDINARY_API_KEY!;
  const secret = process.env.CLOUDINARY_API_SECRET!;
  const publicId = `receipts/${opts.contestantId}/${opts.paymentId}`;
  const timestamp = Math.floor(Date.now() / 1000);

  // Cloudinary signature: sha1(sortedParams + apiSecret).
  const signedParams: Record<string, string> = {
    public_id: publicId,
    timestamp: String(timestamp),
    overwrite: "true",
  };
  const toSign = Object.keys(signedParams)
    .sort()
    .map((k) => `${k}=${signedParams[k]}`)
    .join("&");
  const signature = crypto
    .createHash("sha1")
    .update(toSign + secret)
    .digest("hex");

  const form = new FormData();
  form.append("file", opts.file);
  form.append("api_key", apiKey);
  form.append("signature", signature);
  for (const [k, v] of Object.entries(signedParams)) {
    form.append(k, v);
  }

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloud}/image/upload`,
    { method: "POST", body: form }
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Cloudinary receipt upload failed: HTTP ${res.status} ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    secure_url: string;
    public_id: string;
    bytes: number;
    format: string;
  };
  return {
    secureUrl: data.secure_url,
    publicId: data.public_id,
    bytes: data.bytes,
    format: data.format,
  };
}

export function validateAuditionVideo(
  meta: Pick<CloudinaryResource, "duration" | "bytes" | "height" | "format">,
  c: VideoConstraints = AUDITION_CONSTRAINTS
): { ok: true } | { ok: false; reason: string } {
  if (meta.duration < c.minSec) {
    return {
      ok: false,
      reason: `Audition is too short — ${Math.round(meta.duration)}s, minimum ${c.minSec}s.`,
    };
  }
  if (meta.duration > c.maxSec) {
    return {
      ok: false,
      reason: `Audition is too long — ${Math.round(meta.duration)}s, maximum ${c.maxSec}s.`,
    };
  }
  if (meta.bytes > c.maxBytes) {
    const mb = Math.round(meta.bytes / (1024 * 1024));
    return {
      ok: false,
      reason: `File is too large — ${mb} MB, maximum ${c.maxBytes / (1024 * 1024)} MB.`,
    };
  }
  if (meta.height < c.minHeight) {
    return {
      ok: false,
      reason: `Resolution is too low — ${meta.height}p, minimum ${c.minHeight}p.`,
    };
  }
  if (!c.acceptedFormats.includes(meta.format.toLowerCase())) {
    return {
      ok: false,
      reason: `Format "${meta.format}" not supported — use ${c.acceptedFormats.join(", ")}.`,
    };
  }
  return { ok: true };
}
