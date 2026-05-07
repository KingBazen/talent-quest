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
import type { ContestantDTO, SubmissionDTO } from "@/lib/dto-types";
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
  const [showUrlFallback, setShowUrlFallback] = React.useState(false);

  React.useEffect(() => {
    api
      .get<{ uploadsAvailable: boolean }>("/api/submissions")
      .then((d) => setUploadsAvailable(d.uploadsAvailable))
      .catch(() => setUploadsAvailable(false));
  }, []);

  return (
    <div className="space-y-5">
      <PaymentSummary />

      {uploadsAvailable && (
        <AuditionUploader
          defaultTitle=""
          category={contestant.category}
          uploadsAvailable={uploadsAvailable}
          onComplete={() => {
            void onChange();
          }}
        />
      )}

      <div className="rounded-2xl border border-border/60 bg-card p-6 space-y-4">
        {!uploadsAvailable ? (
          <div className="flex items-center gap-3">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500/20 to-brand-700/20 text-brand-500">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-xl font-bold">
                Submit your audition video
              </h3>
              <p className="text-xs text-muted-foreground">
                Direct upload isn&apos;t configured for this environment yet.
                Paste a public video URL (YouTube / Drive / Cloudinary) below
                and we&apos;ll review the link.
              </p>
            </div>
          </div>
        ) : (
          <div>
            <button
              type="button"
              onClick={() => setShowUrlFallback((v) => !v)}
              className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              {showUrlFallback ? "Hide" : "Trouble uploading? Paste a URL instead"}
            </button>
          </div>
        )}

        {(!uploadsAvailable || showUrlFallback) && (
          <UrlFallbackForm contestant={contestant} onChange={onChange} />
        )}
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-6">
        <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
          Your submissions ({submissions.length})
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
                  <p className="text-sm font-semibold">{s.title}</p>
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

function UrlFallbackForm({
  contestant,
  onChange,
}: {
  contestant: ContestantDTO;
  onChange: () => Promise<void>;
}) {
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
        title,
        category: contestant.category,
        videoUrl,
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
    <form onSubmit={submit} className="grid sm:grid-cols-2 gap-3">
      <input
        required
        minLength={2}
        maxLength={120}
        placeholder="Audition title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="h-11 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <input
        required
        type="url"
        placeholder="https://youtube.com/watch?v=…"
        value={videoUrl}
        onChange={(e) => setVideoUrl(e.target.value)}
        className="h-11 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <Button
        type="submit"
        variant="outline"
        disabled={busy}
        className="sm:col-span-2"
      >
        {busy ? "Submitting…" : "Submit URL"}
      </Button>
      {err && <p className="text-xs text-destructive sm:col-span-2">{err}</p>}
    </form>
  );
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
