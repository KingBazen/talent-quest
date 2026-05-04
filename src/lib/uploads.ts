import crypto from "node:crypto";

/**
 * Upload provider abstraction.
 *
 * If CLOUDINARY_* env vars are present we generate a signed direct-upload
 * payload the browser can POST to Cloudinary's `/video/upload` endpoint —
 * no bytes ever touch this server. Otherwise we fall back to local writes
 * under /public/uploads (dev only — not durable on Vercel).
 */

export interface UploadIntent {
  provider: "cloudinary" | "local";
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

export function createUploadIntent(opts: {
  contestantId: string;
}): UploadIntent {
  const publicId = `tq/${opts.contestantId}/${crypto
    .randomBytes(6)
    .toString("hex")}`;
  const expiresAt = Math.floor(Date.now() / 1000) + 600;

  if (!uploadsAreLive()) {
    return {
      provider: "local",
      uploadUrl: "/api/submissions/local-upload",
      formFields: { publicId },
      publicId,
      expiresAt: expiresAt * 1000,
    };
  }

  const cloud = process.env.CLOUDINARY_CLOUD_NAME!;
  const apiKey = process.env.CLOUDINARY_API_KEY!;
  const secret = process.env.CLOUDINARY_API_SECRET!;
  const preset = process.env.CLOUDINARY_UPLOAD_PRESET || "talentquest_signed";

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
