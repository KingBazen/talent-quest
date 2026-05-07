"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Upload as UploadIcon,
  Film,
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { api, ApiError } from "@/lib/client-api";
import type { SubmissionDTO } from "@/lib/dto-types";
import type { TalentCategoryId } from "@/types";

// ─── Constraints (mirrored from server, src/lib/uploads.ts) ──────────────────

interface Constraints {
  minSec: number;
  maxSec: number;
  maxBytes: number;
  minHeight: number;
  acceptedFormats: string[];
}

const FALLBACK_CONSTRAINTS: Constraints = {
  minSec: 60,
  maxSec: 180,
  maxBytes: 500 * 1024 * 1024,
  minHeight: 480,
  acceptedFormats: ["mp4", "mov", "webm", "m4v", "quicktime"],
};

// ─── Server-issued upload intent ─────────────────────────────────────────────

interface UploadIntent {
  provider: "cloudinary";
  uploadUrl: string;
  formFields: Record<string, string>;
  publicId: string;
  expiresAt: number;
}

interface IntentResponse {
  intent: UploadIntent;
  constraints: Constraints;
}

// ─── Cloudinary direct-upload response ───────────────────────────────────────

interface CloudinaryUploadResponse {
  public_id: string;
  secure_url: string;
  format: string;
  bytes: number;
  width: number;
  height: number;
  duration: number;
  version: number;
}

// ─── Component state ─────────────────────────────────────────────────────────

type State =
  | { kind: "idle" }
  | { kind: "reading"; file: File }
  | { kind: "ready"; file: File; meta: LocalMeta }
  | { kind: "uploading"; file: File; meta: LocalMeta; progress: number; attempt: number }
  | { kind: "finalizing"; file: File; meta: LocalMeta }
  | { kind: "success"; submission: SubmissionDTO }
  | { kind: "failed"; reason: string; canRetry: boolean };

interface LocalMeta {
  durationSec: number;
  width: number;
  height: number;
  sizeBytes: number;
  format: string;
  objectUrl: string;
}

const MAX_RETRIES = 3;

export interface AuditionUploaderProps {
  defaultTitle: string;
  category: TalentCategoryId;
  uploadsAvailable: boolean;
  onComplete: (submission: SubmissionDTO) => void;
}

export function AuditionUploader({
  defaultTitle,
  category,
  uploadsAvailable,
  onComplete,
}: AuditionUploaderProps) {
  const [state, setState] = React.useState<State>({ kind: "idle" });
  const [title, setTitle] = React.useState(defaultTitle);
  const [constraints, setConstraints] =
    React.useState<Constraints>(FALLBACK_CONSTRAINTS);
  const xhrRef = React.useRef<XMLHttpRequest | null>(null);

  // Cleanup any object URL we created for the local preview.
  React.useEffect(() => {
    return () => {
      if (state.kind === "ready" || state.kind === "uploading" || state.kind === "finalizing") {
        URL.revokeObjectURL(state.meta.objectUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── File pick + local metadata read ─────────────────────────────────────
  async function onFilePicked(file: File) {
    setState({ kind: "reading", file });

    try {
      const meta = await readLocalVideoMeta(file);
      const v = checkLocally(meta, constraints);
      if (!v.ok) {
        URL.revokeObjectURL(meta.objectUrl);
        setState({ kind: "failed", reason: v.reason, canRetry: false });
        return;
      }
      setState({ kind: "ready", file, meta });
    } catch (err) {
      setState({
        kind: "failed",
        reason:
          err instanceof Error
            ? `Could not read video metadata: ${err.message}`
            : "Could not read video metadata.",
        canRetry: false,
      });
    }
  }

  // ─── Upload pipeline ─────────────────────────────────────────────────────
  async function startUpload(attempt = 1) {
    // Caller must be in a state that has a `file + meta` to upload. `failed`
    // states with `canRetry: true` re-pick (handled by the retry button) so
    // we don't enter here from `failed`.
    if (state.kind !== "ready" && state.kind !== "uploading") return;
    if (!title || title.trim().length < 2) {
      setState({
        kind: "failed",
        reason: "Give your audition a title (≥ 2 characters).",
        canRetry: true,
      });
      return;
    }

    const { file, meta } = state;

    try {
      setState({ kind: "uploading", file, meta, progress: 0, attempt });

      // 1. Fetch a fresh signed intent (each upload uses its own).
      const { intent, constraints: serverConstraints } =
        await api.get<IntentResponse>("/api/uploads/intent");
      setConstraints(serverConstraints);

      // 2. Direct-upload to Cloudinary with XHR for progress events.
      const cloudResponse = await uploadToCloudinaryWithProgress(
        intent,
        file,
        (progress) =>
          setState((s) =>
            s.kind === "uploading" ? { ...s, progress } : s
          ),
        xhrRef
      );

      // 3. Server-side finalize: verifies metadata against Cloudinary's
      //    Admin API and writes the submission row.
      setState({ kind: "finalizing", file, meta });
      const { submission } = await api.post<{ submission: SubmissionDTO }>(
        "/api/uploads/finalize",
        {
          publicId: cloudResponse.public_id,
          title: title.trim(),
          category,
        }
      );

      setState({ kind: "success", submission });
      onComplete(submission);
    } catch (err) {
      // Retry transient (network) errors a few times. ApiError(4xx) is fatal.
      const isApi = err instanceof ApiError;
      const transient = !isApi || (isApi && err.status >= 500);

      if (transient && attempt < MAX_RETRIES) {
        // Exponential backoff: 1s, 2s, 4s.
        const wait = 1000 * 2 ** (attempt - 1);
        setState({
          kind: "uploading",
          file,
          meta,
          progress: 0,
          attempt: attempt + 1,
        });
        await new Promise((r) => setTimeout(r, wait));
        return startUpload(attempt + 1);
      }

      setState({
        kind: "failed",
        reason:
          err instanceof Error
            ? err.message
            : "Upload failed for an unknown reason.",
        canRetry: true,
      });
    }
  }

  function cancel() {
    xhrRef.current?.abort();
    if (state.kind === "ready" || state.kind === "uploading" || state.kind === "finalizing") {
      URL.revokeObjectURL(state.meta.objectUrl);
    }
    setState({ kind: "idle" });
  }

  function retry() {
    if (state.kind === "failed" && state.canRetry) {
      // Force the user to re-pick the file — the previous File handle may be
      // gone (browsers can release pointer-leaving objects).
      setState({ kind: "idle" });
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────
  if (!uploadsAvailable) {
    // Not configured — caller will surface URL-paste fallback. Show nothing
    // to avoid rendering a dead picker.
    return null;
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6 space-y-5">
      <div className="flex items-start gap-3">
        <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500/20 to-brand-700/20 text-brand-500">
          <UploadIcon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-display text-xl font-bold">
            Upload your audition video
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {constraints.minSec}–{constraints.maxSec}s ·{" "}
            {constraints.acceptedFormats.slice(0, 3).join(" / ")} · ≤{" "}
            {Math.round(constraints.maxBytes / (1024 * 1024))} MB ·{" "}
            ≥ {constraints.minHeight}p
          </p>
        </div>
      </div>

      <div>
        <Label htmlFor="audition-title" className="text-sm font-semibold">
          Audition title
        </Label>
        <Input
          id="audition-title"
          className="mt-1.5"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Tezeta — original arrangement"
          maxLength={120}
          disabled={state.kind === "uploading" || state.kind === "finalizing"}
        />
      </div>

      {state.kind === "idle" && (
        <FilePicker onFile={onFilePicked} accept="video/*" />
      )}

      {state.kind === "reading" && (
        <Status
          icon={Loader2}
          spin
          headline="Reading video metadata…"
          body={`Checking ${state.file.name}.`}
        />
      )}

      {state.kind === "ready" && (
        <ReadyPreview
          meta={state.meta}
          file={state.file}
          onUpload={() => startUpload(1)}
          onCancel={cancel}
        />
      )}

      {state.kind === "uploading" && (
        <UploadingState
          meta={state.meta}
          file={state.file}
          progress={state.progress}
          attempt={state.attempt}
          onCancel={cancel}
        />
      )}

      {state.kind === "finalizing" && (
        <Status
          icon={Loader2}
          spin
          headline="Verifying with Cloudinary…"
          body="The platform is double-checking your file's metadata before saving."
        />
      )}

      {state.kind === "success" && (
        <SuccessPreview submission={state.submission} onReplace={cancel} />
      )}

      {state.kind === "failed" && (
        <FailedState reason={state.reason} canRetry={state.canRetry} onRetry={retry} />
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function FilePicker({
  onFile,
  accept,
}: {
  onFile: (f: File) => void;
  accept: string;
}) {
  const ref = React.useRef<HTMLInputElement>(null);
  const [drag, setDrag] = React.useState(false);

  return (
    <label
      htmlFor="audition-file"
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onFile(f);
      }}
      className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-colors ${
        drag
          ? "border-brand-500 bg-brand-500/5"
          : "border-border/60 bg-background hover:border-brand-500/50 hover:bg-muted/20"
      }`}
    >
      <Film className="h-10 w-10 text-muted-foreground" />
      <p className="font-semibold">Tap to pick a video, or drop it here</p>
      <p className="text-xs text-muted-foreground">
        Phone-shot is fine. We&apos;ll show you a preview before submitting.
      </p>
      <input
        ref={ref}
        id="audition-file"
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
    </label>
  );
}

function ReadyPreview({
  meta,
  file,
  onUpload,
  onCancel,
}: {
  meta: LocalMeta;
  file: File;
  onUpload: () => void;
  onCancel: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <video
        controls
        preload="metadata"
        className="w-full rounded-xl bg-black"
        src={meta.objectUrl}
      />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <Stat label="Duration" v={fmtDuration(meta.durationSec)} />
        <Stat label="Resolution" v={`${meta.width}×${meta.height}`} />
        <Stat label="Size" v={`${(meta.sizeBytes / (1024 * 1024)).toFixed(1)} MB`} />
        <Stat label="Format" v={meta.format} />
      </div>
      <p className="text-xs text-muted-foreground">
        File: <span className="font-mono break-all">{file.name}</span>
      </p>
      <div className="flex gap-2">
        <Button variant="gradient" onClick={onUpload}>
          Upload audition
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Pick a different file
        </Button>
      </div>
    </motion.div>
  );
}

function UploadingState({
  meta,
  file,
  progress,
  attempt,
  onCancel,
}: {
  meta: LocalMeta;
  file: File;
  progress: number;
  attempt: number;
  onCancel: () => void;
}) {
  const sentBytes = Math.round((meta.sizeBytes * progress) / 100);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">
          Uploading {file.name}
          {attempt > 1 && (
            <Badge variant="outline" className="ml-2">
              retry {attempt}/{MAX_RETRIES}
            </Badge>
          )}
        </span>
        <span className="font-mono text-xs text-muted-foreground">{progress}%</span>
      </div>
      <Progress value={progress} />
      <p className="text-xs text-muted-foreground">
        {(sentBytes / (1024 * 1024)).toFixed(1)} of{" "}
        {(meta.sizeBytes / (1024 * 1024)).toFixed(1)} MB sent. Don&apos;t close
        the tab — uploads run in the foreground.
      </p>
      <Button variant="outline" size="sm" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}

function SuccessPreview({
  submission,
  onReplace,
}: {
  submission: SubmissionDTO;
  onReplace: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-4"
    >
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex items-start gap-3">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500 mt-0.5" />
        <div>
          <p className="font-semibold">Audition received.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Status: <span className="font-mono">{submission.status}</span> ·{" "}
            Saved {new Date(submission.createdAt).toLocaleString()}.
          </p>
        </div>
      </div>
      {submission.videoUrl && (
        <video
          controls
          preload="metadata"
          className="w-full rounded-xl bg-black"
          src={submission.videoUrl}
        />
      )}
      <Button variant="outline" onClick={onReplace}>
        <RefreshCw className="h-4 w-4 mr-1.5" /> Replace with another take
      </Button>
    </motion.div>
  );
}

function FailedState({
  reason,
  canRetry,
  onRetry,
}: {
  reason: string;
  canRetry: boolean;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
      <XCircle className="h-5 w-5 shrink-0 text-destructive mt-0.5" />
      <div className="flex-1">
        <p className="font-semibold">Upload didn&apos;t go through</p>
        <p className="text-sm text-muted-foreground mt-1">{reason}</p>
        {canRetry && (
          <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
            <RefreshCw className="h-4 w-4 mr-1.5" /> Try again
          </Button>
        )}
      </div>
    </div>
  );
}

function Status({
  icon: Icon,
  spin,
  headline,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  spin?: boolean;
  headline: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-background p-4 flex items-start gap-3">
      <Icon className={`h-5 w-5 shrink-0 text-brand-500 mt-0.5 ${spin ? "animate-spin" : ""}`} />
      <div>
        <p className="font-semibold">{headline}</p>
        <p className="text-xs text-muted-foreground mt-1">{body}</p>
      </div>
    </div>
  );
}

function Stat({ label, v }: { label: string; v: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="font-medium">{v}</p>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

async function readLocalVideoMeta(file: File): Promise<LocalMeta> {
  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.preload = "metadata";
  video.src = objectUrl;
  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () =>
      reject(
        new Error(
          "The browser couldn't read this file as a video. Try a different format (MP4 / MOV / WEBM)."
        )
      );
  });
  // Some browsers report `duration: Infinity` for streamed-encoded WEBM until
  // the player seeks. This works around it.
  if (!isFinite(video.duration)) {
    await new Promise<void>((resolve) => {
      video.currentTime = Number.MAX_SAFE_INTEGER;
      video.ontimeupdate = () => {
        video.ontimeupdate = null;
        video.currentTime = 0;
        resolve();
      };
    });
  }
  return {
    durationSec: video.duration,
    width: video.videoWidth,
    height: video.videoHeight,
    sizeBytes: file.size,
    format: (file.name.split(".").pop() || file.type.split("/").pop() || "")
      .toLowerCase(),
    objectUrl,
  };
}

function checkLocally(
  meta: LocalMeta,
  c: Constraints
): { ok: true } | { ok: false; reason: string } {
  if (meta.durationSec < c.minSec)
    return {
      ok: false,
      reason: `Audition is too short — ${Math.round(meta.durationSec)}s, minimum ${c.minSec}s.`,
    };
  if (meta.durationSec > c.maxSec)
    return {
      ok: false,
      reason: `Audition is too long — ${Math.round(meta.durationSec)}s, maximum ${c.maxSec}s.`,
    };
  if (meta.sizeBytes > c.maxBytes) {
    const mb = Math.round(meta.sizeBytes / (1024 * 1024));
    return {
      ok: false,
      reason: `File is too large — ${mb} MB, maximum ${Math.round(c.maxBytes / (1024 * 1024))} MB.`,
    };
  }
  if (meta.height < c.minHeight)
    return {
      ok: false,
      reason: `Resolution is too low — ${meta.height}p, minimum ${c.minHeight}p.`,
    };
  if (!c.acceptedFormats.includes(meta.format))
    return {
      ok: false,
      reason: `Format "${meta.format}" not supported — use ${c.acceptedFormats.slice(0, 3).join(" / ")}.`,
    };
  return { ok: true };
}

function uploadToCloudinaryWithProgress(
  intent: UploadIntent,
  file: File,
  onProgress: (percent: number) => void,
  xhrRef: React.MutableRefObject<XMLHttpRequest | null>
): Promise<CloudinaryUploadResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;

    const form = new FormData();
    for (const [k, v] of Object.entries(intent.formFields)) {
      form.append(k, v);
    }
    form.append("file", file);

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as CloudinaryUploadResponse);
        } catch {
          reject(new Error("Cloudinary returned a malformed response."));
        }
      } else if (xhr.status === 0) {
        reject(new Error("Upload was cancelled."));
      } else {
        reject(new Error(`Cloudinary upload failed with HTTP ${xhr.status}.`));
      }
    });
    xhr.addEventListener("error", () =>
      reject(new Error("Network error during upload."))
    );
    xhr.addEventListener("abort", () =>
      reject(new Error("Upload was cancelled."))
    );

    xhr.open("POST", intent.uploadUrl);
    xhr.send(form);
  });
}
