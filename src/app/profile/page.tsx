"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowRight,
  LogOut,
  Upload,
  Trophy,
  Calendar,
  Loader2,
  CreditCard,
  ExternalLink,
  XCircle,
  RefreshCw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { LatestPayment } from "@/components/auth/SessionProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TALENT_CATEGORIES } from "@/data/categories";
import { JUDGING_CRITERIA, SCHEDULE } from "@/data/judging";
import { useSession } from "@/components/auth/SessionProvider";
import { api, ApiError } from "@/lib/client-api";
import type { ContestantDTO, SubmissionDTO } from "@/lib/dto-types";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
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
          Sign in to view your profile.
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

  async function advance() {
    try {
      await api.post("/api/contestants/me/advance");
      await refresh();
    } catch (e) {
      if (e instanceof ApiError) alert(e.message);
    }
  }

  async function handleLogout() {
    await logout();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="container py-10 md:py-14 space-y-8">
      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20 ring-4 ring-brand-500/30">
            <AvatarFallback className="bg-gradient-to-br from-brand-500 to-fuchsia-500 text-white text-2xl">
              {contestant.fullName
                .split(" ")
                .map((p) => p[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <Badge variant="gradient" className="mb-1">
              <Sparkles className="h-3 w-3 mr-1" />
              Verified contestant
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
          <Button variant="gradient" size="sm" onClick={advance}>
            <ArrowRight className="h-4 w-4 mr-1.5" /> Advance step
          </Button>
        </div>
      </div>

      <Tabs defaultValue="progress">
        <TabsList>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="submission">Submission</TabsTrigger>
          <TabsTrigger value="scores">Scores</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>

        <TabsContent value="progress">
          <div className="rounded-2xl border border-border/60 bg-card p-6 space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Round 1</p>
                <h3 className="font-display text-2xl font-bold">
                  {Math.round(pct)}% complete
                </h3>
              </div>
              <Badge
                variant={contestant.status === "advanced" ? "gradient" : "secondary"}
                className="capitalize"
              >
                {contestant.status}
              </Badge>
            </div>
            <Progress value={pct} />

            <ol className="relative border-l border-border/60 ml-3 mt-4 space-y-5">
              {contestant.progress.map((p) => (
                <li key={p.key} className="ml-6">
                  <span
                    className={cn(
                      "absolute -left-2 flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-background",
                      p.done
                        ? "bg-gradient-to-r from-brand-500 to-fuchsia-500"
                        : "bg-muted"
                    )}
                  >
                    {p.done ? (
                      <CheckCircle2 className="h-3 w-3 text-white" />
                    ) : (
                      <Clock className="h-2.5 w-2.5 text-muted-foreground" />
                    )}
                  </span>
                  <p className="font-semibold">{p.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.done && p.date
                      ? new Date(p.date).toLocaleString()
                      : "Pending"}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </TabsContent>

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

        <TabsContent value="account">
          <div className="rounded-2xl border border-border/60 bg-card p-6 grid md:grid-cols-2 gap-4 text-sm">
            <Row k="Full name" v={contestant.fullName} />
            <Row k="Stage name" v={contestant.stageName || "—"} />
            <Row k="Email" v={contestant.email} />
            <Row k="Phone" v={contestant.phone} />
            <Row k="City" v={contestant.city} />
            <Row k="Age" v={String(contestant.age)} />
            <Row k="Category" v={cat?.name || "—"} />
            <Row k="Experience" v={contestant.experience} />
            <Row
              k="Registered"
              v={new Date(contestant.createdAt).toLocaleString()}
            />
            <Row k="Status" v={contestant.status} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-background px-3 py-2">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium text-right">{v}</span>
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
        videoUrl: videoUrl || null,
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
    <div className="space-y-5">
      <PaymentCard />
      <div className="rounded-2xl border border-border/60 bg-card p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500/20 to-fuchsia-500/20 text-brand-500">
          <Upload className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-display text-xl font-bold">Submit your video</h3>
          <p className="text-xs text-muted-foreground">
            Paste a YouTube / Cloudinary URL, or upload directly when Cloudinary
            credentials are configured. Submissions auto-mark the &quot;video
            submitted&quot; step.
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="grid sm:grid-cols-2 gap-3">
        <input
          required
          minLength={2}
          maxLength={120}
          placeholder="Video title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-11 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          type="url"
          placeholder="https://youtube.com/watch?v=…  (optional)"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          className="h-11 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <Button
          type="submit"
          variant="gradient"
          disabled={busy}
          className="sm:col-span-2"
        >
          {busy ? "Submitting…" : "Submit video"}
        </Button>
        {err && <p className="text-xs text-destructive sm:col-span-2">{err}</p>}
      </form>

      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
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
    </div>
  );
}

interface PaymentIntent {
  paymentId: string;
  amountCents: number;
  currency: string;
  redirectUrl: string;
  mode: "api" | "checkout" | "stub";
}

interface PaymentStatusResponse {
  id: string;
  status: "pending" | "succeeded" | "failed" | "refunded";
  amountCents: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

function PaymentCard() {
  const { latestPayment, refresh } = useSession();
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [intent, setIntent] = React.useState<PaymentIntent | null>(null);
  const [pollStatus, setPollStatus] =
    React.useState<PaymentStatusResponse["status"] | null>(null);
  const [open, setOpen] = React.useState(false);
  const popupRef = React.useRef<Window | null>(null);

  // Poll the active payment id while the modal is open and the status is pending.
  const pollingId = intent?.paymentId ?? null;
  React.useEffect(() => {
    if (!pollingId || !open) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      if (stopped) return;
      try {
        const data = await api.get<PaymentStatusResponse>(
          `/api/payments/${pollingId}`
        );
        if (stopped) return;
        setPollStatus(data.status);
        if (data.status !== "pending") {
          // Payment resolved — refresh session and stop polling.
          await refresh();
          return;
        }
      } catch {
        /* ignore transient errors and keep polling */
      }
      timer = setTimeout(tick, 4000);
    };
    void tick();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [pollingId, open, refresh]);

  async function pay() {
    setErr(null);
    setBusy(true);
    try {
      const i = await api.post<PaymentIntent>("/api/payments/init");
      setIntent(i);
      setPollStatus("pending");
      setOpen(true);
      // Open AdmasPay in a new tab. We try popup first; if blocked, the
      // modal still shows a clickable link.
      const w = window.open(i.redirectUrl, "_blank", "noopener,noreferrer");
      popupRef.current = w;
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Could not start payment");
    } finally {
      setBusy(false);
    }
  }

  async function checkNow() {
    if (!intent) return;
    try {
      const data = await api.get<PaymentStatusResponse>(
        `/api/payments/${intent.paymentId}`
      );
      setPollStatus(data.status);
      if (data.status !== "pending") {
        await refresh();
      }
    } catch (e) {
      setErr(
        e instanceof ApiError ? e.message : "Status check failed"
      );
    }
  }

  function reopenTab() {
    if (!intent) return;
    const w = window.open(intent.redirectUrl, "_blank", "noopener,noreferrer");
    popupRef.current = w;
  }

  function closeModal() {
    setOpen(false);
  }

  // ─── Render: already paid ────────────────────────────────────────────────
  if (latestPayment?.status === "succeeded") {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-display text-xl font-bold">
              Registration fee paid
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              ETB {(latestPayment.amountCents / 100).toFixed(2)} ·{" "}
              {new Date(latestPayment.createdAt).toLocaleString()}
            </p>
          </div>
          <Badge variant="gradient" className="shrink-0">
            Confirmed
          </Badge>
        </div>
      </div>
    );
  }

  // ─── Render: idle / failed / pending (no active intent yet) ──────────────
  return (
    <>
      <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-brand-500/5 via-fuchsia-500/5 to-cyan-500/5 p-6">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-fuchsia-500 text-white">
            <CreditCard className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-[220px]">
            <h3 className="font-display text-xl font-bold">
              Registration fee · 50 ETB
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Confirm your spot on the bracket. Pay securely via AdmasPay
              (Telebirr / CBE / card) — opens in a new tab; your status updates
              here automatically.
            </p>
            {latestPayment?.status === "pending" && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                A previous attempt is still pending. Click below to retry or
                resume it.
              </p>
            )}
            {latestPayment?.status === "failed" && (
              <p className="text-xs text-destructive mt-2">
                Last attempt failed. Try again below.
              </p>
            )}
          </div>
          <Button
            variant="gradient"
            size="lg"
            onClick={pay}
            disabled={busy}
            className="shrink-0"
          >
            {busy ? "Starting…" : "Pay with AdmasPay"}
            <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
        </div>
        {err && (
          <p className="mt-3 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
            {err}
          </p>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <PaymentStatusModal
            intent={intent}
            status={pollStatus}
            latestPayment={latestPayment}
            onReopen={reopenTab}
            onCheck={checkNow}
            onClose={closeModal}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function PaymentStatusModal({
  intent,
  status,
  latestPayment,
  onReopen,
  onCheck,
  onClose,
}: {
  intent: PaymentIntent | null;
  status: PaymentStatusResponse["status"] | null;
  latestPayment: LatestPayment | null;
  onReopen: () => void;
  onCheck: () => void;
  onClose: () => void;
}) {
  // Prefer the freshest status: poll result, then session, then assume pending.
  const effective =
    latestPayment?.id === intent?.paymentId
      ? latestPayment?.status ?? status ?? "pending"
      : status ?? "pending";

  if (effective === "succeeded") {
    return (
      <>
        <DialogHeader>
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white mb-2">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <DialogTitle className="text-center">Payment confirmed</DialogTitle>
          <DialogDescription className="text-center">
            We&apos;ve received your registration fee. Your status has been
            updated and you can submit your video any time.
          </DialogDescription>
        </DialogHeader>
        <Button onClick={onClose} variant="gradient" className="mt-2">
          Continue <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </>
    );
  }

  if (effective === "failed") {
    return (
      <>
        <DialogHeader>
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-destructive text-white mb-2">
            <XCircle className="h-7 w-7" />
          </div>
          <DialogTitle className="text-center">Payment didn&apos;t go through</DialogTitle>
          <DialogDescription className="text-center">
            AdmasPay reported the transaction as failed. No funds were taken.
            You can try again below.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button variant="gradient" onClick={onReopen}>
            Try again <RefreshCw className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </>
    );
  }

  // pending
  return (
    <>
      <DialogHeader>
        <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-fuchsia-500 text-white mb-2">
          <Loader2 className="h-7 w-7 animate-spin" />
        </div>
        <DialogTitle className="text-center">
          Complete payment in the new tab
        </DialogTitle>
        <DialogDescription className="text-center">
          We&apos;ve opened AdmasPay&apos;s secure checkout in a new tab. Once
          you finish there, this page updates automatically — usually within a
          few seconds. You can close that tab whenever you&apos;re done.
        </DialogDescription>
      </DialogHeader>
      <div className="rounded-xl bg-muted/50 border border-border/60 p-3 text-xs text-muted-foreground">
        <p className="font-mono break-all">
          ref: {intent?.paymentId ?? "—"} · ETB{" "}
          {intent ? (intent.amountCents / 100).toFixed(2) : "—"}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={onCheck}>
          <RefreshCw className="mr-2 h-4 w-4" /> Check status
        </Button>
        <Button variant="outline" onClick={onReopen}>
          <ExternalLink className="mr-2 h-4 w-4" /> Reopen checkout
        </Button>
      </div>
      <p className="text-center text-[11px] text-muted-foreground">
        Pop-up blocked? Click <b>Reopen checkout</b> above.
      </p>
      <Button variant="ghost" size="sm" onClick={onClose} className="mt-1">
        I&apos;ll come back later
      </Button>
    </>
  );
}
