"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, LogOut, Shield, Gavel, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "./ThemeToggle";
import { LangToggle } from "@/components/i18n/LangToggle";
import { cn } from "@/lib/utils";
import { useSession } from "@/components/auth/SessionProvider";
import { BlingLogo } from "@/components/brand/BlingLogo";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/auditions", label: "Auditions" },
  { href: "/show-format", label: "Show format" },
  { href: "/categories", label: "Categories" },
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
        <Link
          href="/"
          aria-label="Bling Records Talent Show — home"
          className="flex items-center gap-3 font-bold"
        >
          <BlingLogo variant="icon" size={40} />
          <span className="hidden sm:inline-flex flex-col leading-none">
            <span className="font-display text-[15px] font-extrabold tracking-tight bg-clip-text text-transparent bg-[linear-gradient(110deg,#fde68a_0%,#facc15_25%,#fff7c2_50%,#eab308_75%,#a16207_100%)] bg-[length:200%_100%] animate-shine">
              BLING RECORDS
            </span>
            <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.32em] text-brand-500/80">
              Talent Show
            </span>
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
          <LangToggle className="hidden md:inline-flex" />
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
                  <Link href="/contestant/dashboard">
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
                          : "/contestant/dashboard"
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
