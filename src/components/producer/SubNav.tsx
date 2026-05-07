"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Film, Calendar, Tv } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/producer/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/producer/episodes", label: "Episodes", icon: Film },
  { href: "/producer/schedule", label: "Schedule", icon: Calendar },
];

export function ProducerSubNav() {
  const pathname = usePathname() ?? "";
  return (
    <nav className="flex flex-wrap items-center gap-1 rounded-2xl border border-border/60 bg-card p-1.5 mb-6 overflow-x-auto">
      {ITEMS.map((it) => {
        const active = pathname.startsWith(it.href);
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
      <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground px-3">
        <Tv className="h-3.5 w-3.5" />
        Producer
      </div>
    </nav>
  );
}
