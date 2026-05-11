"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Star,
  Send,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Flag,
  RotateCcw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSession } from "@/components/auth/SessionProvider";
import { RefereeSubNav } from "@/components/referee/SubNav";
import { JUDGING_CRITERIA } from "@/data/judging";
import { TALENT_CATEGORIES } from "@/data/categories";
import { api, ApiError } from "@/lib/client-api";
import { cn } from "@/lib/utils";

interface DetailResponse {
  submission: {
    id: string;
    title: string;
    status: "pending" | "approved" | "rejected" | "flagged" | "superseded";
    videoUrl: string | null;
    thumbnailUrl: string | null;
    durationSec: number | null;
    cloudinaryPublicId: string | null;
    width: number | null;
    height: number | null;
    slot: "main" | "extra_1" | "extra_2";
    createdAt: string;
  };
  /** Phase 13: optional supplementary videos. Review-only — scoring still
   *  applies to the main submission. */
  extras: {
    id: string;
    slot: "main" | "extra_1" | "extra_2";
    title: string;
    videoUrl: string | null;
    durationSec: number | null;
    width: number | null;
    height: number | null;
    createdAt: string;
  }[];
  contestant: {
    id: string;
    displayName: string;
    stageName: string | null;
    city: string;
    category: string;
  } | null;
  myScores: { criterion: string; points: number; maxPoints: number }[];
  myNote: { notes: string; publicNotes: string | null; updatedAt: string } | null;
  aggregate: {
    submissionId: string;
    total: number;
    judgesCount: number;
    perCriterion: { key: string; avg: number; max: number }[];
  };
  iHaveScored: boolean;
}

export default function RefereeDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { user, loading: sessionLoading } = useSession();

  const [data, setData] = React.useState<DetailResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [scores, setScores] = React.useState<Record<string, number>>(() =>
    Object.fromEntries(JUDGING_CRITERIA.map((c) => [c.key, 0]))
  );
  const [notes, setNotes] = React.useState("");
  const [publicNotes, setPublicNotes] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const r = await api.get<DetailResponse>(`/api/referee/submissions/${id}`);
      setData(r);
      // Pre-fill the form with whatever this referee has previously scored.
      const next: Record<string, number> = Object.fromEntries(
        JUDGING_CRITERIA.map((c) => [c.key, 0])
      );
      for (const s of r.myScores) next[s.criterion] = s.points;
      setScores(next);
      setNotes(r.myNote?.notes ?? "");
      setPublicNotes(r.myNote?.publicNotes ?? "");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load");
    }
  }, [id]);

  React.useEffect(() => {
    if (!sessionLoading && (user?.role === "referee" || user?.role === "admin")) {
      void load();
    }
  }, [load, sessionLoading, user]);

  if (sessionLoading || (!data && !error)) {
    return (
      <div className="container py-20 text-center">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="container py-20 max-w-xl text-center">
        <Badge variant="outline" className="mb-3">Error</Badge>
        <p className="text-destructive">{error}</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/referee/submissions">
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to queue
          </Link>
        </Button>
      </div>
    );
  }
  if (!data) return null;

  const cat = TALENT_CATEGORIES.find((c) => c.id === data.contestant?.category);
  const total = JUDGING_CRITERIA.reduce(
    (s, c) => s + (scores[c.key] || 0),
    0
  );

  function setScore(key: string, val: number, max: number) {
    setScores((p) => ({
      ...p,
      [key]: Math.max(0, Math.min(max, Math.round(val))),
    }));
  }

  async function submit(force = false) {
    if (!data) return;
    if (data.iHaveScored && !force) {
      setConfirmOpen(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.post("/api/scores", {
        submissionId: data.submission.id,
        scores,
        notes,
        publicNotes,
      });
      await load();
      setConfirmOpen(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Score save failed");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(
    status: "pending" | "approved" | "rejected" | "flagged"
  ) {
    if (!data) return;
    setBusy(true);
    setError(null);
    try {
      await api.patch(
        `/api/referee/submissions/${data.submission.id}/status`,
        { status }
      );
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Status update failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container py-10 md:py-14 space-y-6">
      <RefereeSubNav />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/referee/submissions">
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to queue
          </Link>
        </Button>
        <Badge variant={badgeForStatus(data.submission.status)} className="capitalize">
          {data.submission.status}
        </Badge>
      </div>

      <div className="grid lg:grid-cols-[1fr_380px] gap-6">
        {/* Player + context */}
        <div className="rounded-3xl overflow-hidden border border-border/60 bg-card">
          <div className="relative aspect-video bg-black">
            {data.submission.videoUrl ? (
              <video
                key={data.submission.videoUrl}
                controls
                preload="metadata"
                className="w-full h-full"
                src={data.submission.videoUrl}
                poster={data.submission.thumbnailUrl ?? undefined}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-white/60 text-sm">
                Video URL pending — referee can still record notes.
              </div>
            )}
          </div>
          <div className="p-5 border-t border-border/60 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="gradient" className="capitalize">
                {cat?.emoji} {cat?.name ?? data.contestant?.category ?? "—"}
              </Badge>
              <Badge variant="secondary" className="font-mono">
                ID {data.contestant?.id ?? "—"}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                main competition video
              </Badge>
            </div>
            <h2 className="font-display text-2xl font-bold">
              {data.submission.title}
            </h2>
            <p className="text-sm text-muted-foreground">
              {data.contestant?.displayName ?? "—"} · {data.contestant?.city ?? "—"}
              {data.submission.durationSec
                ? ` · ${Math.floor(data.submission.durationSec / 60)}:${String(
                    data.submission.durationSec % 60
                  ).padStart(2, "0")}`
                : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              Aggregate: {data.aggregate.total} / 100 from{" "}
              {data.aggregate.judgesCount}{" "}
              {data.aggregate.judgesCount === 1 ? "judge" : "judges"}
            </p>
          </div>

          {data.extras.length > 0 && (
            <div className="border-t border-border/60 p-5 space-y-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">
                  More from this contestant ({data.extras.length})
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Review-only · scoring applies to the main video
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {data.extras.map((x) => (
                  <ExtraVideo key={x.id} extra={x} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Score panel */}
        <div className="rounded-3xl border border-border/60 bg-card p-5 space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <p className="font-semibold">Your score</p>
              <span className="font-display text-2xl font-bold gradient-text">
                {total} / 100
              </span>
            </div>
            <Progress value={total} className="mt-2" />
          </div>

          <div className="space-y-3">
            {JUDGING_CRITERIA.map((c) => {
              const labelId = `crit-${c.key}-label`;
              const sliderId = `crit-${c.key}-slider`;
              return (
                <div key={c.key}>
                  <div className="flex items-center justify-between text-sm">
                    <span id={labelId} className="font-medium">
                      {c.label}
                    </span>
                    <span className="text-muted-foreground">
                      {scores[c.key] || 0} / {c.weight}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {c.description}
                  </p>
                  <input
                    id={sliderId}
                    type="range"
                    min={0}
                    max={c.weight}
                    value={scores[c.key] || 0}
                    onChange={(e) =>
                      setScore(c.key, Number(e.target.value), c.weight)
                    }
                    className="mt-2 w-full accent-brand-500"
                    aria-labelledby={labelId}
                    aria-valuemin={0}
                    aria-valuemax={c.weight}
                    aria-valuenow={scores[c.key] || 0}
                  />
                  <div
                    className="mt-2 flex gap-1.5"
                    role="radiogroup"
                    aria-labelledby={labelId}
                  >
                    {Array.from({ length: 5 }).map((_, i) => {
                      const isActive =
                        (scores[c.key] || 0) >= ((i + 1) / 5) * c.weight;
                      return (
                        <button
                          key={i}
                          role="radio"
                          aria-checked={isActive}
                          onClick={() =>
                            setScore(c.key, ((i + 1) / 5) * c.weight, c.weight)
                          }
                          className={cn(
                            "rounded-md p-1 transition",
                            isActive ? "text-gold-500" : "text-muted-foreground"
                          )}
                          aria-label={`${c.label}: ${i + 1} of 5 stars`}
                        >
                          <Star
                            className={cn(
                              "h-4 w-4",
                              isActive && "fill-gold-500"
                            )}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div>
            <label
              htmlFor="private-notes"
              className="text-sm font-medium mb-1.5 block"
            >
              Private notes
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                · panel-only
              </span>
            </label>
            <Textarea
              id="private-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="What worked, what didn't. Stays inside the panel."
            />
          </div>

          <div>
            <label
              htmlFor="public-notes"
              className="text-sm font-medium mb-1.5 block"
            >
              Public-facing feedback
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                · shared with the contestant
              </span>
            </label>
            <Textarea
              id="public-notes"
              value={publicNotes}
              onChange={(e) => setPublicNotes(e.target.value)}
              rows={3}
              placeholder="Tighten the pre-chorus. Your tone in the second verse landed."
            />
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button
            onClick={() => submit()}
            variant="gradient"
            size="lg"
            disabled={busy}
            className="w-full"
          >
            {busy ? "Saving…" : data.iHaveScored ? "Update score" : "Submit score"}
            <Send className="ml-2 h-4 w-4" />
          </Button>

          {/* Status mutation */}
          <div className="rounded-xl border border-border/60 bg-background p-3 space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Submission status
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={busy || data.submission.status === "approved"}
                onClick={() => setStatus("approved")}
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-emerald-500" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy || data.submission.status === "rejected"}
                onClick={() => setStatus("rejected")}
              >
                <XCircle className="h-3.5 w-3.5 mr-1.5 text-destructive" />
                Reject
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy || data.submission.status === "flagged"}
                onClick={() => setStatus("flagged")}
              >
                <Flag className="h-3.5 w-3.5 mr-1.5 text-amber-500" />
                Flag
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy || data.submission.status === "pending"}
                onClick={() => setStatus("pending")}
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                Reset
              </Button>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground text-center">
            Scores are persisted to the database and aggregated across all
            referees in real time.
          </p>
        </div>
      </div>

      {/* Confirm-before-overwrite modal */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update your score?</DialogTitle>
            <DialogDescription>
              You&apos;ve scored this submission before. Submitting again will
              replace your previous values for every criterion. The aggregate
              recalculates immediately.
            </DialogDescription>
          </DialogHeader>
          {data.myScores.length > 0 && (
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-xs space-y-1">
              <p className="font-semibold text-foreground">Previous score</p>
              {JUDGING_CRITERIA.map((c) => {
                const prev = data.myScores.find((s) => s.criterion === c.key);
                const next = scores[c.key] ?? 0;
                const changed = (prev?.points ?? 0) !== next;
                return (
                  <p key={c.key} className={changed ? "text-foreground" : ""}>
                    <span className="text-muted-foreground">{c.label}:</span>{" "}
                    {prev?.points ?? 0} → <strong>{next}</strong>
                    {changed && " ✱"}
                  </p>
                );
              })}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="gradient"
              onClick={() => submit(true)}
              disabled={busy}
            >
              {busy ? "Saving…" : "Yes, update"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function badgeForStatus(
  s: DetailResponse["submission"]["status"]
): "secondary" | "outline" | "gradient" | "default" {
  switch (s) {
    case "approved":
      return "gradient";
    case "pending":
      return "outline";
    case "flagged":
      return "secondary";
    case "rejected":
      return "secondary";
    case "superseded":
      return "secondary";
  }
}

function ExtraVideo({
  extra,
}: {
  extra: DetailResponse["extras"][number];
}) {
  // Inline-playable URLs are direct video files or Cloudinary delivery URLs.
  // Foreign embeds (YouTube, Drive previews) get a click-through link instead
  // of a broken <video> element.
  const playable = (() => {
    if (!extra.videoUrl) return false;
    try {
      const u = new URL(extra.videoUrl);
      if (u.hostname.includes("res.cloudinary.com")) return true;
      return /\.(mp4|webm|m4v|mov|ogv)(?:\?|$)/i.test(u.pathname);
    } catch {
      return false;
    }
  })();
  const slotLabel = extra.slot === "extra_1" ? "Extra 1" : "Extra 2";
  return (
    <div className="rounded-xl border border-border/60 bg-background overflow-hidden">
      <div className="relative aspect-video bg-black">
        {extra.videoUrl && playable ? (
          <video
            controls
            preload="metadata"
            className="w-full h-full"
            src={extra.videoUrl}
          />
        ) : extra.videoUrl ? (
          <a
            href={extra.videoUrl}
            target="_blank"
            rel="noreferrer"
            className="absolute inset-0 flex items-center justify-center text-white/80 text-sm hover:text-white"
          >
            Open external link ↗
          </a>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-white/60 text-xs">
            No URL on file
          </div>
        )}
      </div>
      <div className="p-3 text-xs">
        <div className="flex items-center gap-1.5 mb-1">
          <Badge variant="outline" className="text-[10px]">{slotLabel}</Badge>
          {extra.durationSec && (
            <span className="text-muted-foreground">
              {Math.floor(extra.durationSec / 60)}:
              {String(extra.durationSec % 60).padStart(2, "0")}
            </span>
          )}
        </div>
        <p className="font-medium truncate">{extra.title}</p>
      </div>
    </div>
  );
}
