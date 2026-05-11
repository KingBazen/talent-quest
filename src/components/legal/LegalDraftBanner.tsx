import { AlertTriangle } from "lucide-react";

interface LegalDraftBannerProps {
  /**
   * Last revision date (YYYY-MM-DD) — printed underneath the warning so the
   * reader can tell whether the placeholder copy is recent.
   */
  lastReviewed: string;
  /**
   * One-sentence label for what this document is — appears in the warning
   * line so users can tell at a glance what is in draft.
   */
  documentName: string;
}

/**
 * Prominent draft notice for every legal page. The Bling Records Talent Show is
 * pre-launch and these pages are placeholder text written by the build team —
 * they are NOT legal advice and must be replaced (or signed off) by counsel
 * before any production deploy. The §8 Pre-Production Gate in the task
 * tracker tracks the replacement.
 */
export function LegalDraftBanner({
  lastReviewed,
  documentName,
}: LegalDraftBannerProps) {
  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 md:p-5 text-sm">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="space-y-1.5">
          <p className="font-semibold text-amber-200">
            Draft placeholder — not legal advice
          </p>
          <p className="text-amber-100/80">
            This {documentName} is a working draft authored by the build team
            so contestants can see the shape of the policy during the private
            beta. It has <strong>not</strong> been reviewed by counsel and is
            <strong> not legally binding</strong>. Replace this document with a
            counsel-reviewed version before any public launch or marketing
            push.
          </p>
          <p className="text-amber-100/60 text-xs">
            Last revised: <span className="font-mono">{lastReviewed}</span> ·
            Tracked under §8 Pre-Production Gate in{" "}
            <code className="font-mono">docs/task-tracker.md</code>.
          </p>
        </div>
      </div>
    </div>
  );
}
