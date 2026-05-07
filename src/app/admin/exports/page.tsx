"use client";

import * as React from "react";
import Link from "next/link";
import { Download, Users, Film, CreditCard, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/auth/SessionProvider";
import { AdminSubNav } from "@/components/admin/SubNav";

export default function AdminExportsPage() {
  const { user, loading } = useSession();

  if (loading) {
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

  return (
    <div className="container py-10 md:py-14 space-y-6 max-w-3xl">
      <AdminSubNav />

      <div>
        <Badge variant="outline" className="mb-2">Admin · Exports</Badge>
        <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
          Download <span className="gradient-text">CSV</span>.
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Quick CSV exports for offline analysis or partner reports. Filters
          live in URL params if you need a narrower slice — e.g.
          <code className="ml-1 rounded bg-muted px-1">?kind=submissions&amp;status=approved</code>.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <ExportCard
          title="Contestants"
          icon={Users}
          description="Profile + contact info, pipeline status, registered date."
          href="/api/admin/exports?kind=contestants"
        />
        <ExportCard
          title="Submissions"
          icon={Film}
          description="Audition rows with format, duration, status, and judge totals."
          href="/api/admin/exports?kind=submissions"
        />
        <ExportCard
          title="Payments"
          icon={CreditCard}
          description="Every payment row, provider ref, status, timestamps."
          href="/api/admin/exports?kind=payments"
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Exports are server-streamed — large datasets may take a few seconds to
        complete. The browser will hold the connection until the file is
        finalised.
      </p>
    </div>
  );
}

function ExportCard({
  title,
  icon: Icon,
  description,
  href,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  href: string;
}) {
  return (
    <a
      href={href}
      download
      className="block rounded-2xl border border-border/60 bg-card p-5 hover:border-brand-500/50 transition-colors"
    >
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500/20 to-brand-700/20 text-brand-500">
        <Icon className="h-4 w-4" />
      </div>
      <h3 className="mt-3 font-display text-lg font-bold">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      <p className="mt-3 inline-flex items-center text-sm text-brand-500">
        <Download className="h-4 w-4 mr-1.5" /> Download CSV
      </p>
    </a>
  );
}
