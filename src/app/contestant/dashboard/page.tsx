"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  ArrowRight,
  LogOut,
  Upload,
  Trophy,
  Calendar,
  Loader2,
  CreditCard,
  CheckCircle2,
  Star,
  Plus,
  Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TALENT_CATEGORIES } from "@/data/categories";
import { JUDGING_CRITERIA, SCHEDULE } from "@/data/judging";
import { useSession } from "@/components/auth/SessionProvider";
import { ContestantSubNav } from "@/components/contestant/SubNav";
import { VerifyEmailBanner } from "@/components/contestant/VerifyEmailBanner";
import { AuditionUploader } from "@/components/upload/AuditionUploader";
import { api, ApiError } from "@/lib/client-api";
import type {
  ContestantDTO,
  SubmissionDTO,
  SubmissionSlot,
} from "@/lib/dto-types";
import { statusCopy } from "@/lib/status-copy";

export default function DashboardPage() {
  const router = useRouter();
  const { user, contestant, loading, refresh, logout } = useSession();
  const [submissions, setSubmissions] = React.useState<SubmissionDTO[]>([]);

  React.useEffect(() => {
    if (!user || user.role !== "contestant") return;
    api
      .get<{ items: SubmissionDTO[] }>("/api/submissions")
      .then((d) => setSubmissions(d.items))
      .catch(() => {});
  }, [user]);

  if (loading) {
    return (
      <div className="container py-20 text-center">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container py-20 max-w-xl text-center">
        <Badge variant="outline" className="mb-3">No active session</Badge>
        <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
          Sign in to view your dashboard.
        </h1>
        <p className="mt-3 text-muted-foreground">
          Your contestant record, progress, and submissions live behind your
          account login.
        </p>
        <div className="mt-6 flex gap-2 justify-center">
          <Button asChild variant="gradient" size="lg">
            <Link href="/login">Login</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/register">Register</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (user.role !== "contestant" || !contestant) {
    return (
      <div className="container py-20 max-w-xl text-center">
        <Badge variant="outline" className="mb-3">{user.role} account</Badge>
        <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
          You&apos;re signed in as {user.role}.
        </h1>
        <p className="mt-3 text-muted-foreground">
          Profiles are for contestant accounts. Head to your role dashboard.
        </p>
        <Button
          asChild
          variant="gradient"
          size="lg"
          className="mt-6"
        >
          <Link href={user.role === "admin" ? "/admin" : "/referee"}>
            Open my dashboard
          </Link>
        </Button>
      </div>
    );
  }

  const cat = TALENT_CATEGORIES.find((c) => c.id === contestant.category);
  const completed = contestant.progress.filter((p) => p.done).length;
  const pct = (completed / contestant.progress.length) * 100;

  async function handleLogout() {
    await logout();
    router.push("/");
    router.refresh();
  }

  const copy = statusCopy(contestant.status);

  return (
    <div className="container py-10 md:py-14 space-y-6">
      <ContestantSubNav />
      <VerifyEmailBanner />

      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20 ring-4 ring-brand-500/30">
            <AvatarFallback className="bg-gradient-to-br from-brand-400 to-brand-600 text-white text-2xl">
              {contestant.fullName
                .split(" ")
                .map((p) => p[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <Badge variant={copy.badge} className="mb-1">
              <Sparkles className="h-3 w-3 mr-1" />
              {copy.label}
            </Badge>
            <h1 className="font-display text-2xl md:text-4xl font-bold tracking-tight">
              {contestant.stageName || contestant.fullName}
            </h1>
            <p className="text-sm text-muted-foreground">
              {cat?.emoji} {cat?.name} · {contestant.city} · age {contestant.age}
            </p>
            <p className="font-mono text-sm mt-1">
              ID: <span className="gradient-text font-bold">{contestant.id}</span>
            </p>
          </div>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-1.5" /> Logout
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-5">
        <p className="text-sm">{copy.description}</p>
        <p className="mt-2 text-xs font-semibold text-brand-500">
          Next: {copy.nextStep}
        </p>
      </div>

      <Tabs defaultValue="submission">
        <TabsList>
          <TabsTrigger value="submission">Submission</TabsTrigger>
          <TabsTrigger value="scores">Scores</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="submission">
          <SubmissionTab
            contestant={contestant}
            submissions={submissions}
            onChange={async () => {
              await refresh();
              const d = await api.get<{ items: SubmissionDTO[] }>(
                "/api/submissions"
              );
              setSubmissions(d.items);
            }}
          />
        </TabsContent>

        <TabsContent value="scores">
          <div className="rounded-2xl border border-border/60 bg-card p-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Live score</p>
                <h3 className="font-display text-2xl font-bold flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-gold-500" />
                  Pending judges
                </h3>
              </div>
              <Badge variant="secondary">Awaiting referee panel</Badge>
            </div>

            <div className="mt-4 grid md:grid-cols-2 gap-3">
              {JUDGING_CRITERIA.map((c) => (
                <div
                  key={c.key}
                  className="rounded-xl border border-border/60 bg-background p-4"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold">{c.label}</span>
                    <span>0 / {c.weight}</span>
                  </div>
                  <Progress className="mt-2" value={0} />
                </div>
              ))}
            </div>
            <p className="mt-4 text-[11px] text-muted-foreground">
              Once three or more referees submit scores via the referee
              dashboard, the average is averaged and published here.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="schedule">
          <div className="rounded-2xl border border-border/60 bg-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-brand-500" />
              <h3 className="font-display text-xl font-bold">Your schedule</h3>
            </div>
            <ol className="space-y-3">
              {SCHEDULE.map((s) => (
                <li
                  key={s.date}
                  className="flex items-center justify-between rounded-xl border border-border/60 bg-background px-4 py-3"
                >
                  <div>
                    <p className="font-semibold">{s.label}</p>
                    <p className="text-xs text-muted-foreground">{s.date}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}

// Phase 13: three-slot submission flow. Each slot gets its own card with the
// local-upload picker as the main option and a YouTube/URL paste as an
// alternative. The competition slot is required; the two extras are optional
// supplementary videos referees can review when they want more context.
const SLOT_META: Record<
  SubmissionSlot,
  { number: string; title: string; subtitle: string; required: boolean }
> = {
  main: {
    number: "1",
    title: "Main competition video",
    subtitle:
      "60–180s · phone-shot is fine. This is the take referees score against the rubric.",
    required: true,
  },
  extra_1: {
    number: "2",
    title: "Extra video (optional)",
    subtitle:
      "A different song, instrument, or angle. Referees can preview this if they want more of you.",
    required: false,
  },
  extra_2: {
    number: "3",
    title: "Another extra video (optional)",
    subtitle:
      "One more clip — original song, live set, anything that adds to your story.",
    required: false,
  },
};

function SubmissionTab({
  contestant,
  submissions,
  onChange,
}: {
  contestant: ContestantDTO;
  submissions: SubmissionDTO[];
  onChange: () => Promise<void>;
}) {
  const [uploadsAvailable, setUploadsAvailable] = React.useState(false);

  React.useEffect(() => {
    api
      .get<{ uploadsAvailable: boolean }>("/api/submissions")
      .then((d) => setUploadsAvailable(d.uploadsAvailable))
      .catch(() => setUploadsAvailable(false));
  }, []);

  // Latest non-superseded submission per slot. We render the slot card from
  // here so a contestant who already filled a slot sees their video and a
  // "replace" affordance instead of the empty picker.
  const bySlot: Record<SubmissionSlot, SubmissionDTO | undefined> = {
    main: submissions.find(
      (s) => s.slot === "main" && s.status !== "superseded"
    ),
    extra_1: submissions.find(
      (s) => s.slot === "extra_1" && s.status !== "superseded"
    ),
    extra_2: submissions.find(
      (s) => s.slot === "extra_2" && s.status !== "superseded"
    ),
  };

  return (
    <div className="space-y-5">
      <PaymentSummary />

      <SlotCard
        slot="main"
        contestant={contestant}
        current={bySlot.main}
        uploadsAvailable={uploadsAvailable}
        onChange={onChange}
      />

      <SlotCard
        slot="extra_1"
        contestant={contestant}
        current={bySlot.extra_1}
        uploadsAvailable={uploadsAvailable}
        onChange={onChange}
        unlocked={Boolean(bySlot.main)}
      />

      <SlotCard
        slot="extra_2"
        contestant={contestant}
        current={bySlot.extra_2}
        uploadsAvailable={uploadsAvailable}
        onChange={onChange}
        unlocked={Boolean(bySlot.main)}
      />

      <div className="rounded-2xl border border-border/60 bg-card p-6">
        <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
          Submission history ({submissions.length})
        </p>
        {submissions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No submissions yet.</p>
        ) : (
          <ul className="space-y-2">
            {submissions.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-xl border border-border/60 bg-background px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold">
                    {s.title}{" "}
                    <Badge variant="outline" className="ml-1 text-[10px]">
                      {s.slot === "main" ? "main" : s.slot.replace("_", " ")}
                    </Badge>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(s.createdAt).toLocaleString()} · {s.status}
                    {s.supersedesId && " · replaces an earlier take"}
                  </p>
                </div>
                {s.videoUrl && (
                  <a
                    href={s.videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-brand-500 hover:underline"
                  >
                    Open
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function SlotCard({
  slot,
  contestant,
  current,
  uploadsAvailable,
  onChange,
  unlocked = true,
}: {
  slot: SubmissionSlot;
  contestant: ContestantDTO;
  current: SubmissionDTO | undefined;
  uploadsAvailable: boolean;
  onChange: () => Promise<void>;
  unlocked?: boolean;
}) {
  const meta = SLOT_META[slot];
  const [mode, setMode] = React.useState<"upload" | "url">("upload");
  const isMain = slot === "main";

  // Extras are gated on having a main video so users finish the required
  // submission first. We still render the card (so users see what's coming)
  // but disable the picker until they upload the main competition entry.
  const locked = !unlocked && !current;

  return (
    <div
      className={`rounded-2xl border p-6 space-y-4 ${
        current
          ? "border-emerald-500/30 bg-emerald-500/5"
          : isMain
          ? "border-brand-500/40 bg-card"
          : "border-border/60 bg-card"
      }`}
    >
      <div className="flex items-start gap-3 flex-wrap">
        <div
          className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
            current
              ? "bg-emerald-500 text-white"
              : isMain
              ? "bg-gradient-to-br from-brand-400 to-brand-600 text-white"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {current ? <CheckCircle2 className="h-5 w-5" /> : meta.number}
        </div>
        <div className="flex-1 min-w-[200px]">
          <h3 className="font-display text-lg font-bold flex items-center gap-2 flex-wrap">
            {meta.title}
            {isMain ? (
              <Badge variant="gradient" className="text-[10px]">
                <Star className="h-2.5 w-2.5 mr-1" /> Required
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px]">Optional</Badge>
            )}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">{meta.subtitle}</p>
        </div>
      </div>

      {current ? (
        <CurrentVideoPreview
          submission={current}
          onReplace={() => {
            // Toggling to upload mode resets the form; the user can then pick
            // a new file or paste a URL — the API will mark the prior one as
            // superseded inside its slot.
            setMode("upload");
          }}
        />
      ) : locked ? (
        <div className="rounded-xl border border-dashed border-border/60 bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
          Upload your main competition video first — extras unlock right after.
        </div>
      ) : (
        <>
          <SlotModeSwitch
            mode={mode}
            onMode={setMode}
            uploadsAvailable={uploadsAvailable}
          />
          {mode === "upload" && uploadsAvailable && (
            <AuditionUploader
              defaultTitle={
                isMain
                  ? ""
                  : `${contestant.fullName.split(" ")[0]} — extra clip`
              }
              category={contestant.category}
              uploadsAvailable={uploadsAvailable}
              slot={slot}
              heading={
                isMain
                  ? "Upload from your phone or computer"
                  : "Upload extra video from your device"
              }
              hideTitle={!isMain}
              onComplete={() => {
                void onChange();
              }}
            />
          )}
          {(mode === "url" || !uploadsAvailable) && (
            <UrlSubmissionForm
              slot={slot}
              contestant={contestant}
              onChange={onChange}
            />
          )}
        </>
      )}
    </div>
  );
}

function SlotModeSwitch({
  mode,
  onMode,
  uploadsAvailable,
}: {
  mode: "upload" | "url";
  onMode: (m: "upload" | "url") => void;
  uploadsAvailable: boolean;
}) {
  return (
    <div className="inline-flex rounded-xl border border-border/60 bg-muted/30 p-1 text-xs font-semibold">
      <button
        type="button"
        onClick={() => onMode("upload")}
        disabled={!uploadsAvailable}
        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors ${
          mode === "upload" && uploadsAvailable
            ? "bg-background text-foreground shadow"
            : "text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
        }`}
      >
        <Upload className="h-3.5 w-3.5" />
        Upload from device
        <Badge variant="gradient" className="ml-1 text-[9px]">
          Recommended
        </Badge>
      </button>
      <button
        type="button"
        onClick={() => onMode("url")}
        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors ${
          mode === "url"
            ? "bg-background text-foreground shadow"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Link2 className="h-3.5 w-3.5" />
        Paste video link
      </button>
    </div>
  );
}

function CurrentVideoPreview({
  submission,
  onReplace,
}: {
  submission: SubmissionDTO;
  onReplace: () => void;
}) {
  const [replacing, setReplacing] = React.useState(false);

  if (replacing) {
    // Returning the parent state to its picker view is handled by the parent
    // re-rendering after refresh; meanwhile we offer a back-out so the user
    // doesn't get trapped. The actual picker reappears once the prior
    // submission row is marked superseded by the next upload.
    return null;
  }

  return (
    <div className="space-y-3">
      {submission.videoUrl &&
        (isPlayableMediaUrl(submission.videoUrl) ? (
          <video
            controls
            preload="metadata"
            className="w-full rounded-xl bg-black"
            src={submission.videoUrl}
          />
        ) : (
          <a
            href={submission.videoUrl}
            target="_blank"
            rel="noreferrer"
            className="block rounded-xl border border-border/60 bg-background px-4 py-3 text-sm hover:border-brand-500/50 transition-colors"
          >
            <span className="font-medium">Open video link</span>{" "}
            <span className="text-muted-foreground break-all">
              · {submission.videoUrl}
            </span>
          </a>
        ))}
      <div className="flex items-center justify-between gap-2 flex-wrap text-xs text-muted-foreground">
        <span>
          {submission.title}
          {" · "}
          status <span className="font-mono">{submission.status}</span>
          {" · "}
          uploaded {new Date(submission.createdAt).toLocaleDateString()}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setReplacing(true);
            onReplace();
          }}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Replace
        </Button>
      </div>
    </div>
  );
}

function UrlSubmissionForm({
  slot,
  contestant,
  onChange,
}: {
  slot: SubmissionSlot;
  contestant: ContestantDTO;
  onChange: () => Promise<void>;
}) {
  const isMain = slot === "main";
  const [title, setTitle] = React.useState("");
  const [videoUrl, setVideoUrl] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await api.post("/api/submissions", {
        title:
          title.trim() ||
          (isMain
            ? `${contestant.fullName.split(" ")[0]} — audition`
            : `${contestant.fullName.split(" ")[0]} — extra`),
        category: contestant.category,
        videoUrl,
        slot,
      });
      setTitle("");
      setVideoUrl("");
      await onChange();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Submission failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-xl border border-border/60 bg-background p-4 space-y-3"
    >
      <p className="text-xs text-muted-foreground">
        Already have your video on YouTube, Drive, or another host? Paste the
        public link here.
      </p>
      {isMain && (
        <input
          minLength={2}
          maxLength={120}
          placeholder="Audition title (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      )}
      <input
        required
        type="url"
        placeholder="https://youtube.com/watch?v=…"
        value={videoUrl}
        onChange={(e) => setVideoUrl(e.target.value)}
        className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-muted-foreground">
          Make sure anyone with the link can view it (not private).
        </p>
        <Button type="submit" variant="outline" size="sm" disabled={busy}>
          {busy ? "Saving…" : isMain ? "Submit link" : "Add extra link"}
        </Button>
      </div>
      {err && <p className="text-xs text-destructive">{err}</p>}
    </form>
  );
}

/** Inline-playable URLs are direct video files (mp4/webm/etc) or Cloudinary
 *  delivery URLs. Embeds (YouTube, Drive previews) need their own player, so
 *  we render those as a "Open link" anchor instead of the broken `<video>`
 *  tag. */
function isPlayableMediaUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.hostname.includes("res.cloudinary.com")) return true;
    return /\.(mp4|webm|m4v|mov|ogv)(?:\?|$)/i.test(u.pathname);
  } catch {
    return false;
  }
}

// Slim payment summary tile. Full payment management lives at /contestant/payment.
function PaymentSummary() {
  const { latestPayment } = useSession();

  if (latestPayment?.status === "succeeded") {
    return (
      <Link
        href="/contestant/payment"
        className="block rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 hover:bg-emerald-500/10 transition-colors"
      >
        <div className="flex items-start gap-4 flex-wrap">
          <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <p className="font-semibold">Audition fee paid</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              ETB {(latestPayment.amountCents / 100).toFixed(2)} ·{" "}
              {new Date(latestPayment.createdAt).toLocaleDateString()}
            </p>
          </div>
          <Badge variant="gradient" className="shrink-0">
            Confirmed
          </Badge>
          <ArrowRight className="h-4 w-4 text-muted-foreground self-center" />
        </div>
      </Link>
    );
  }

  if (latestPayment?.status === "pending") {
    return (
      <Link
        href="/contestant/payment"
        className="block rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 hover:bg-amber-500/10 transition-colors"
      >
        <div className="flex items-start gap-4 flex-wrap">
          <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
          <div className="flex-1">
            <p className="font-semibold">Payment in progress</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              We&apos;re waiting on AdmasPay to confirm — open the payment page
              for live status.
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground self-center" />
        </div>
      </Link>
    );
  }

  return (
    <Link
      href="/contestant/payment"
      className="block rounded-2xl border border-border/60 bg-gradient-to-br from-brand-500/5 via-brand-500/5 to-brand-700/5 p-5 hover:border-brand-500/40 transition-colors"
    >
      <div className="flex items-start gap-4 flex-wrap">
        <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white">
          <CreditCard className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-[220px]">
          <p className="font-semibold">Audition fee · 500 ETB</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Required before you can upload your audition. Pay by AdmasPay
            (Telebirr / M-Pesa / CBE Birr) or by uploading a bank-transfer
            receipt screenshot.
          </p>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground self-center" />
      </div>
    </Link>
  );
}
