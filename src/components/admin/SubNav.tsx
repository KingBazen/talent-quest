"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Film,
  Gavel,
  Trophy,
  CreditCard,
  Mail,
  Settings,
  ScrollText,
  Download,
  ShieldAlert,
  Vote,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/contestants", label: "Contestants", icon: Users },
  { href: "/admin/submissions", label: "Submissions", icon: Film },
  { href: "/admin/assignments", label: "Assignments", icon: Gavel },
  { href: "/admin/results", label: "Results", icon: Trophy },
  { href: "/admin/voting", label: "Voting", icon: Vote },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/moderation", label: "Moderation", icon: ShieldAlert },
  { href: "/admin/messages", label: "Messages", icon: Mail },
  { href: "/admin/exports", label: "Exports", icon: Download },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/audit-logs", label: "Audit log", icon: ScrollText },
];

export function AdminSubNav() {
  const pathname = usePathname() ?? "";
  return (
    <nav className="flex flex-wrap items-center gap-1 rounded-2xl border border-border/60 bg-card p-1.5 mb-6 overflow-x-auto">
      {ITEMS.map((it) => {
        const active =
          it.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap",
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
