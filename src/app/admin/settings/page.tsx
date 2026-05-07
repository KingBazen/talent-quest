"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, Settings as SettingsIcon, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/components/auth/SessionProvider";
import { AdminSubNav } from "@/components/admin/SubNav";
import { api, ApiError } from "@/lib/client-api";

interface AllSettings {
  fee_required_at: "apply" | "shortlist";
  fee_cents: number;
  registration_open: boolean;
  submissions_open: boolean;
  current_round: number;
}

export default function AdminSettingsPage() {
  const { user, loading: sessionLoading } = useSession();
  const [data, setData] = React.useState<AllSettings | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState<Date | null>(null);

  const load = React.useCallback(async () => {
    try {
      const r = await api.get<AllSettings>("/api/admin/settings");
      setData(r);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load settings");
    }
  }, []);

  React.useEffect(() => {
    if (!sessionLoading && user?.role === "admin") void load();
  }, [load, sessionLoading, user]);

  if (sessionLoading || (!data && !error)) {
    return (
      <div className="container py-20 text-center">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
      </div>
    );
  }
  if (!user || user.role !== "admin") {
    return (
      <div className="container py-20 max-w-xl text-center">
        <Badge variant="outline" className="mb-3">Admin only</Badge>
        <Button asChild variant="gradient" size="lg" className="mt-6">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="container py-20 max-w-xl text-center">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  async function save(patch: Partial<AllSettings>) {
    setBusy(true);
    setError(null);
    try {
      const r = await api.patch<{ changed: number; settings: AllSettings }>(
        "/api/admin/settings",
        patch
      );
      setData(r.settings);
      if (r.changed > 0) setSavedAt(new Date());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container py-10 md:py-14 space-y-6 max-w-3xl">
      <AdminSubNav />

      <div>
        <Badge variant="outline" className="mb-2">Admin · Settings</Badge>
        <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
          Runtime <span className="gradient-text">toggles</span>.
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Changes apply immediately. Each save is audit-logged with the
          before / after values.
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
          {error}
        </p>
      )}
      {savedAt && (
        <p className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 text-sm text-emerald-500">
          Saved {savedAt.toLocaleTimeString()}.
        </p>
      )}

      <div className="rounded-2xl border border-border/60 bg-card p-6 space-y-5">
        <ToggleRow
          label="Registration open"
          description="When off, /register hides itself and POST /api/auth/register returns 403 (Phase-7 work; toggle wired here)."
          value={data.registration_open}
          onChange={(v) => save({ registration_open: v })}
          disabled={busy}
        />
        <ToggleRow
          label="Submissions open"
          description="When off, contestants can register but cannot upload audition videos."
          value={data.submissions_open}
          onChange={(v) => save({ submissions_open: v })}
          disabled={busy}
        />

        <hr className="border-border/40" />

        <div className="grid sm:grid-cols-2 gap-4 items-end">
          <div>
            <Label className="text-xs uppercase tracking-wider">
              Fee required at
            </Label>
            <select
              value={data.fee_required_at}
              onChange={(e) =>
                save({
                  fee_required_at: e.target.value as "apply" | "shortlist",
                })
              }
              disabled={busy}
              className="mt-1.5 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="apply">
                Apply (fee required before upload — current policy)
              </option>
              <option value="shortlist">
                Shortlist (legacy — fee deferred until shortlisted)
              </option>
            </select>
          </div>
          <FeeCentsRow
            value={data.fee_cents}
            disabled={busy}
            onSave={(n) => save({ fee_cents: n })}
          />
        </div>

        <div>
          <Label className="text-xs uppercase tracking-wider">
            Current round
          </Label>
          <div className="mt-1.5 flex gap-2">
            <Input
              type="number"
              min={1}
              max={99}
              defaultValue={data.current_round}
              onBlur={(e) => {
                const n = Number(e.target.value);
                if (Number.isInteger(n) && n !== data.current_round)
                  save({ current_round: n });
              }}
              disabled={busy}
              className="max-w-[120px]"
            />
            <p className="text-xs text-muted-foreground self-center">
              Used by the public schedule + result-checker to label which round
              users are in. Bumps when a round closes.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 text-xs text-muted-foreground space-y-1">
        <p className="font-semibold text-foreground inline-flex items-center gap-1.5">
          <SettingsIcon className="h-3.5 w-3.5" /> Tip
        </p>
        <p>
          Settings live in the <code>settings</code> table as JSONB rows. Adding
          a new key is one entry in <code>src/lib/settings.ts</code> + a row in
          <code> doMigrate()</code>.
        </p>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  value,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p className="font-semibold">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        disabled={disabled}
        className={`shrink-0 inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
          value ? "bg-gradient-to-r from-brand-400 to-brand-600" : "bg-muted"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white transition-transform ${
            value ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

function FeeCentsRow({
  value,
  disabled,
  onSave,
}: {
  value: number;
  disabled?: boolean;
  onSave: (n: number) => void;
}) {
  const [draft, setDraft] = React.useState(String(value));
  React.useEffect(() => {
    setDraft(String(value));
  }, [value]);
  return (
    <div>
      <Label className="text-xs uppercase tracking-wider">
        Fee (ETB cents)
      </Label>
      <div className="mt-1.5 flex gap-2">
        <Input
          type="number"
          min={0}
          max={1_000_000}
          step={100}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={disabled}
        />
        <Button
          variant="outline"
          disabled={disabled || Number(draft) === value || Number.isNaN(Number(draft))}
          onClick={() => onSave(Number(draft))}
        >
          <Save className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground mt-1">
        Currently {(value / 100).toFixed(2)} ETB. Changes apply to{" "}
        <em>future</em> payment intents.
      </p>
    </div>
  );
}
