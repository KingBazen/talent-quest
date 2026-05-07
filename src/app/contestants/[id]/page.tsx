"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Heart,
  Users,
  Loader2,
  MessageCircle,
  Flag,
  Send,
  Vote,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError } from "@/lib/client-api";
import { useSession } from "@/components/auth/SessionProvider";

interface ProfileData {
  contestant: {
    id: string;
    displayName: string;
    city: string;
    category: string;
    status: string;
    bio: string;
    experience: string;
  };
  submission: {
    id: string;
    title: string;
    videoUrl: string;
    thumbnailUrl: string | null;
    durationSec: number | null;
    createdAt: string;
  } | null;
  engagement: {
    likes: number;
    followers: number;
    myLiked: boolean;
    myFollowing: boolean;
    votes: number;
    myVoted: boolean;
    votingOpen: boolean;
    round: number;
  };
  comments: {
    id: string;
    authorDisplay: string;
    authorRole: string;
    body: string;
    flagCount: number;
    status: "visible" | "hidden" | "removed";
    createdAt: string;
  }[];
}

export default function PublicContestantProfilePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { user } = useSession();

  const [data, setData] = React.useState<ProfileData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<
    "like" | "follow" | "comment" | "vote" | null
  >(null);
  const [draft, setDraft] = React.useState("");
  const [commentError, setCommentError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.get<ProfileData>(`/api/contestants/${id}/profile`);
      setData(r);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function toggleLike() {
    if (!user) {
      window.location.href = `/audience/register?next=/contestants/${id}`;
      return;
    }
    setBusy("like");
    try {
      const r = await api.post<{ liked: boolean; total: number }>(
        `/api/contestants/${id}/like`
      );
      if (data) {
        setData({
          ...data,
          engagement: {
            ...data.engagement,
            myLiked: r.liked,
            likes: r.total,
          },
        });
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Like failed");
    } finally {
      setBusy(null);
    }
  }

  async function castVote() {
    if (!user) {
      window.location.href = `/audience/register?next=/contestants/${id}`;
      return;
    }
    setBusy("vote");
    try {
      const r = await api.post<{
        voted: boolean;
        firstTime: boolean;
        total: number;
        round: number;
      }>(`/api/contestants/${id}/vote`);
      if (data) {
        setData({
          ...data,
          engagement: {
            ...data.engagement,
            myVoted: true,
            votes: r.total,
          },
        });
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Vote failed");
    } finally {
      setBusy(null);
    }
  }

  async function toggleFollow() {
    if (!user) {
      window.location.href = `/audience/register?next=/contestants/${id}`;
      return;
    }
    setBusy("follow");
    try {
      const r = await api.post<{ following: boolean; total: number }>(
        `/api/contestants/${id}/follow`
      );
      if (data) {
        setData({
          ...data,
          engagement: {
            ...data.engagement,
            myFollowing: r.following,
            followers: r.total,
          },
        });
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Follow failed");
    } finally {
      setBusy(null);
    }
  }

  async function postComment(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      window.location.href = `/audience/register?next=/contestants/${id}`;
      return;
    }
    if (!draft.trim()) return;
    setBusy("comment");
    setCommentError(null);
    try {
      await api.post(`/api/contestants/${id}/comments`, { body: draft });
      setDraft("");
      await load();
    } catch (e) {
      setCommentError(e instanceof ApiError ? e.message : "Comment failed");
    } finally {
      setBusy(null);
    }
  }

  async function reportComment(commentId: string) {
    if (!user) {
      window.location.href = `/audience/register?next=/contestants/${id}`;
      return;
    }
    try {
      await api.post(`/api/comments/${commentId}/report`, {});
      await load();
    } catch (e) {
      setCommentError(e instanceof ApiError ? e.message : "Report failed");
    }
  }

  if (loading) {
    return (
      <div className="container py-20 text-center">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="container py-20 max-w-lg text-center">
        <Badge variant="outline" className="mb-3">Contestant</Badge>
        <p className="text-muted-foreground">{error ?? "Not found"}</p>
        <Button asChild variant="ghost" size="sm" className="mt-4">
          <Link href="/contestants">Back to directory</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-10 md:py-14 max-w-3xl">
      <Link
        href="/contestants"
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        ← all contestants
      </Link>

      <div className="mt-4 flex items-start gap-4">
        <div className="h-20 w-20 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-white font-bold text-2xl flex items-center justify-center shrink-0">
          {data.contestant.displayName[0]}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">
            {data.contestant.displayName}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {data.contestant.city} · {data.contestant.category} ·{" "}
            <Badge variant="outline" className="text-[10px]">
              {data.contestant.status}
            </Badge>
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button
          variant={data.engagement.myLiked ? "gradient" : "outline"}
          size="sm"
          onClick={() => void toggleLike()}
          disabled={busy === "like"}
        >
          <Heart
            className={`h-4 w-4 mr-1.5 ${
              data.engagement.myLiked ? "fill-current" : ""
            }`}
          />
          {data.engagement.likes.toLocaleString()}
        </Button>
        <Button
          variant={data.engagement.myFollowing ? "gradient" : "outline"}
          size="sm"
          onClick={() => void toggleFollow()}
          disabled={busy === "follow"}
        >
          <Users className="h-4 w-4 mr-1.5" />
          {data.engagement.myFollowing ? "Following" : "Follow"} ·{" "}
          {data.engagement.followers.toLocaleString()}
        </Button>
        {data.engagement.votingOpen && (
          <Button
            variant={data.engagement.myVoted ? "gradient" : "outline"}
            size="sm"
            onClick={() => void castVote()}
            disabled={busy === "vote" || data.engagement.myVoted}
            title={
              data.engagement.myVoted
                ? `You voted for them in round ${data.engagement.round}`
                : `Cast your vote for round ${data.engagement.round}`
            }
          >
            <Vote className="h-4 w-4 mr-1.5" />
            {data.engagement.myVoted ? "Voted" : "Vote"} ·{" "}
            {data.engagement.votes.toLocaleString()}
          </Button>
        )}
      </div>

      {data.submission && (
        <div className="mt-8 rounded-2xl border border-border/60 bg-card overflow-hidden">
          <video
            controls
            preload="metadata"
            poster={data.submission.thumbnailUrl ?? undefined}
            className="w-full bg-black"
            src={data.submission.videoUrl}
          />
          <div className="p-4">
            <p className="font-semibold">{data.submission.title}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {data.submission.durationSec
                ? `${Math.round(data.submission.durationSec / 60)} min ·`
                : ""}{" "}
              uploaded {new Date(data.submission.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      )}

      {(data.contestant.bio || data.contestant.experience) && (
        <div className="mt-6 rounded-2xl border border-border/60 bg-card p-5">
          {data.contestant.bio && (
            <p className="text-sm">{data.contestant.bio}</p>
          )}
          {data.contestant.experience && (
            <p className="text-xs text-muted-foreground mt-3">
              Experience: {data.contestant.experience}
            </p>
          )}
        </div>
      )}

      <section className="mt-10">
        <h2 className="font-semibold flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-brand-500" />
          Comments ({data.comments.length})
        </h2>

        {!user ? (
          <div className="mt-4 rounded-2xl border border-border/60 bg-card p-5 text-center">
            <p className="text-sm text-muted-foreground">
              <Link
                href={`/audience/register?next=/contestants/${id}`}
                className="underline hover:text-foreground"
              >
                Create a fan account
              </Link>{" "}
              or{" "}
              <Link
                href={`/login?next=/contestants/${id}`}
                className="underline hover:text-foreground"
              >
                sign in
              </Link>{" "}
              to leave a comment.
            </p>
          </div>
        ) : (
          <form onSubmit={postComment} className="mt-4 space-y-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Leave a kind, useful comment…"
              maxLength={800}
              rows={3}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{draft.length}/800</span>
              <Button
                type="submit"
                size="sm"
                variant="gradient"
                disabled={busy === "comment" || !draft.trim()}
              >
                {busy === "comment" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5 mr-1.5" /> Post
                  </>
                )}
              </Button>
            </div>
            {commentError && (
              <p className="text-xs text-destructive">{commentError}</p>
            )}
          </form>
        )}

        <ol className="mt-6 space-y-3">
          {data.comments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Be the first to leave a comment.
            </p>
          ) : (
            data.comments.map((c) => (
              <li
                key={c.id}
                className={`rounded-xl border border-border/60 bg-card p-4 text-sm ${
                  c.status === "hidden" ? "opacity-50" : ""
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{c.authorDisplay}</span>
                    {c.authorRole !== "audience" && (
                      <Badge variant="outline" className="text-[10px]">
                        {c.authorRole}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(c.createdAt).toLocaleString()}
                  </span>
                </div>
                {c.status === "hidden" ? (
                  <p className="italic text-muted-foreground">
                    [hidden by a moderator]
                  </p>
                ) : (
                  <p>{c.body}</p>
                )}
                <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
                  {user && c.status === "visible" && (
                    <button
                      onClick={() => void reportComment(c.id)}
                      className="inline-flex items-center gap-1 hover:text-foreground"
                    >
                      <Flag className="h-3 w-3" /> Report
                    </button>
                  )}
                  {c.flagCount > 0 && (
                    <span className="text-amber-500">
                      {c.flagCount} report{c.flagCount > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </li>
            ))
          )}
        </ol>
      </section>
    </div>
  );
}
