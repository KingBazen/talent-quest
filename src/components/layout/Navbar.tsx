"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, Sparkles, X, LogOut, Shield, Gavel, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "./ThemeToggle";
import { cn } from "@/lib/utils";
import { useSession } from "@/components/auth/SessionProvider";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/categories", label: "Categories" },
  { href: "/upload-guide", label: "Upload guide" },
  { href: "/showcase", label: "Showcase" },
  { href: "/result-checker", label: "Results" },
  { href: "/faq", label: "FAQ" },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { user, loading, logout } = useSession();

  async function handleLogout() {
    await logout();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center gap-4">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 via-fuchsia-500 to-cyan-400 text-white shadow-lg shadow-brand-500/30">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="hidden sm:inline-block text-lg tracking-tight">
            TalentQuest
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1 ml-4">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                pathname === item.href && "bg-muted text-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          {!loading && user ? (
            <>
              {user.role === "admin" && (
                <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
                  <Link href="/admin">
                    <Shield className="h-4 w-4 mr-1.5" /> Admin
                  </Link>
                </Button>
              )}
              {(user.role === "referee" || user.role === "admin") && (
                <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
                  <Link href="/referee">
                    <Gavel className="h-4 w-4 mr-1.5" /> Referee
                  </Link>
                </Button>
              )}
              {user.role === "contestant" && (
                <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
                  <Link href="/profile">
                    <User className="h-4 w-4 mr-1.5" /> {user.fullName.split(" ")[0]}
                  </Link>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="hidden md:inline-flex"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-1.5" /> Logout
              </Button>
            </>
          ) : !loading ? (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
                <Link href="/login">Login</Link>
              </Button>
              <Button asChild variant="gradient" size="sm" className="hidden md:inline-flex">
                <Link href="/register">Register</Link>
              </Button>
            </>
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Open menu"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-border/40 bg-background">
          <div className="container py-3 flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
                  pathname === item.href && "bg-muted text-foreground"
                )}
              >
                {item.label}
              </Link>
            ))}
            <div className="grid grid-cols-2 gap-2 pt-2">
              {user ? (
                <>
                  <Button asChild variant="ghost" size="sm">
                    <Link
                      href={
                        user.role === "admin"
                          ? "/admin"
                          : user.role === "referee"
                          ? "/referee"
                          : "/profile"
                      }
                      onClick={() => setOpen(false)}
                    >
                      My dashboard
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleLogout}>
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/login" onClick={() => setOpen(false)}>
                      Login
                    </Link>
                  </Button>
                  <Button asChild variant="gradient" size="sm">
                    <Link href="/register" onClick={() => setOpen(false)}>
                      Register
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
