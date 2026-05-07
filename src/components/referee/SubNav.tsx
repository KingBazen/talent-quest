"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gavel, ListVideo, History } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/referee", label: "Dashboard", icon: Gavel },
  { href: "/referee/submissions", label: "Submissions", icon: ListVideo },
  { href: "/referee/reviews", label: "My reviews", icon: History },
];

export function RefereeSubNav() {
  const pathname = usePathname() ?? "";
  return (
    <nav className="flex flex-wrap items-center gap-1 rounded-2xl border border-border/60 bg-card p-1.5 mb-6 overflow-x-auto">
      {ITEMS.map((it) => {
        const active =
          it.href === "/referee"
            ? pathname === "/referee"
            : pathname.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-gradient-to-r from-brand-400 to-brand-600 text-white"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <it.icon className="h-3.5 w-3.5" />
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
