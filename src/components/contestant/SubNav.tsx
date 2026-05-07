"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  UserCog,
  ListChecks,
  Trophy,
  CreditCard,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/contestant/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/contestant/profile", label: "Profile", icon: UserCog },
  { href: "/contestant/application", label: "Application", icon: ListChecks },
  { href: "/contestant/payment", label: "Payment", icon: CreditCard },
  { href: "/contestant/result", label: "Result", icon: Trophy },
  { href: "/contestant/preferences", label: "Notifications", icon: Bell },
];

export function ContestantSubNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap items-center gap-1 rounded-2xl border border-border/60 bg-card p-1.5 mb-6 overflow-x-auto">
      {ITEMS.map((it) => {
        const active = pathname?.startsWith(it.href);
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
